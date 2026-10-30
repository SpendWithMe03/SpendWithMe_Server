import mongoose, { model } from "mongoose";

const EmbeddingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IncomeAndExpense",
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: function (value) {
          return value.length === 768 && value.every(Number.isFinite);
        },
        message: "Embedding must contain 768 finite numbers.",
      },
    },
  },
  {
    timestamps: true,
  },
);

EmbeddingSchema.index({
  userId: 1,
  expenseId: 1,
});

const EMBEDDING =
  mongoose.models.embedding || model("embedding", EmbeddingSchema);
export default EMBEDDING;
