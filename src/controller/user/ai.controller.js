import { AI, queryExpenses } from "../../utils/helper/index.js";
import HTTP from "../../constants/httpStatusCode.js";
import { jsonOne, throwHttpError } from "../../utils/genrelUtils.js";
import { MODEL_NAME } from "../../config/config.js";
import { tools } from "../../utils/helper/index.js";
import Prompt from "../../trash/index.js";
import { error } from "../../library/Logging.js";

const general_qustion = async (req, res, next) => {
  try {
    const { description } = req.body;

    // Start the conversation.
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: description?.trim(),
          },
        ],
      },
    ];

    const functionsUsed = [];
    let finalAnswer = null;

    // Allow multiple tool calls while preventing endless loops.
    for (let round = 0; round < 5; round++) {
      const response = await AI.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: {
          temperature: 0.2,
          tools,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
          candidateCount: 1,
          responseMimeType: "text/plain",
          stopSequences: [],
          seed: 42,
          systemInstruction: Prompt[2],
        },
      });

      const modelContent = response.candidates?.[0]?.content;

      if (!modelContent) {
        return throwHttpError(
          "Bad_Request",
          "The AI did not return any content.",
          HTTP.BAD_REQUEST,
        );
      }

      // Preserve the model's response in the conversation.
      contents.push(modelContent);

      const calls = response.functionCalls ?? [];

      // No function calls means Gemini has finished answering.
      if (calls.length === 0) {
        finalAnswer = response.text ?? "";
        break;
      }

      const functionResponseParts = [];

      for (const call of calls) {
        let result;

        try {
          if (call.name === "queryExpenses") {
            result = await queryExpenses(call.args ?? {}, req.user);

            functionsUsed.push(call.name);
          } else if (call.name === "searchExpenses") {
            result = await searchExpenses(
              call.args?.question ?? description,
              req.user.toString(),
            );

            functionsUsed.push(call.name);
          } else {
            result = {
              error: "Unsupported function.",
            };
          }
        } catch (err) {
          error(`${call.name} failed:`, err);

          result = {
            error: "The requested expense data could not be retrieved.",
          };
        }

        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { result },
          },
        });
      }

      // Send query results back to Gemini.
      contents.push({
        role: "user",
        parts: functionResponseParts,
      });
    }

    if (!finalAnswer) {
      return throwHttpError(
        "Bad_Gateway",
        "The AI could not finish the answer. Please try again.",
        HTTP.BAD_GATEWAY,
      );
    }

    return jsonOne(res, HTTP.SUCCESS, { answer: finalAnswer });
  } catch (error) {
    next(error);
  }
};

const testModel = async (req, res, next) => {
  try {
    // const { description } = req.body;

    const response = await AI.models.generateContent({
      model: MODEL_NAME,
      contents: `
You are a personal expense assistant.
Use only the expense summary provided below.
Do not invent transaction amounts.

Expense summary:
Food: ₹4000
Travel: ₹2000
Shopping: ₹3000

Question:
Which category has the highest spending?
`,
    });

    return jsonOne(res, HTTP.SUCCESS, { answer: response.text });
  } catch (error) {
    next(error);
  }
};

export default {
  general_qustion,
  testModel,
};
