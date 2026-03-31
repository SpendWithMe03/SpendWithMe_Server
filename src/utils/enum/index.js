const otpType = {
  SIGNUP: "signup",
  FORGOTPASSWORD: "forgotpassword",
  EMAILVERIFICATION: "emailverification",
};

const otpStatus = {
  VALIDATE: "validate",
  DELETED: "deleted",
};

const tokenStatus = {
  VALIDATE: "validate",
  DELETED: "deleted",
};

const paymentStatusType = {
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const paymentType = {
  PAID: "paid",
  UNPAID: "unpaid",
};

const userSchemaType = {
  GOOGLEUSER: "googleUser",
  SIGNUPUSER: "user",
};

const userSchema = {
  googleUser: "GoogleUser",
  user: "User",
};

const splitTypes = {
  EQUALLY: "equally",
  SELECTED: "selected",
};

const expenseType = {
  OTHER: "Other",
  BILLS: "Bills",
  INCOME: "Income",
  FOOD: "Food",
  ENTERTAINMENT: "Entertainment",
  TRANSPORTATION: "Transportation",
  EMI: "EMI",
  HEALTHCARE: "Healthcare",
  EDUCATION: "Education",
  INVESTMENT: "Investment",
  SHOPPING: "Shopping",
  FUEL: "Fuel",
  GROCERY: "Grocery",
};

const RoleType = {
  ADMIN: "admin",
  SUBADMIN: "subAdmin",
  USER: "user",
  GOOGLEUSER: "googleUser",
};

const accessTypes = {
  ACTIVE: "active",
  BLOCKED: "blocked",
};

const monthNames = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];

export {
  otpStatus,
  otpType,
  paymentType,
  userSchema,
  splitTypes,
  monthNames,
  expenseType,
  RoleType,
  accessTypes,
  paymentStatusType,
  userSchemaType,
  tokenStatus,
};
