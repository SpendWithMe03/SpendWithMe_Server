import chalk from "chalk";

const getCurrentTimestamp = () => new Date().toLocaleString();

const info = (args) =>
  console.log(
    chalk.blue(`[${getCurrentTimestamp()}][INFO]`),
    typeof args === "string" ? chalk.blueBright(args) : args
  );

const warn = (args) =>
  console.log(
    chalk.yellow(`[${getCurrentTimestamp()}][WARN]`),
    typeof args === "string" ? chalk.yellowBright(args) : args
  );

const error = (args) =>
  console.log(
    chalk.red(`[${getCurrentTimestamp()}][ERROR]`),
    typeof args === "string"
      ? chalk.redBright(args)
      : chalk.redBright(args.message)
  );

const debug = (args) =>
  console.log(
    chalk.gray(`[${getCurrentTimestamp()}][DEBUG]`),
    typeof args === "string" ? chalk.gray(args) : args
  );

const success = (args) =>
  console.log(
    chalk.green(`[${getCurrentTimestamp()}][SUCCESS]`),
    typeof args === "string" ? chalk.greenBright(args) : args
  );

export { info, warn, error, debug, success };
