import mongoose from "mongoose";
import HTTP from "../../constants/httpStatusCode.js";
import constantMessages from "../../constants/messageConstants.js";
import User from "../../model/User.js";
import GoogleUser from "../../model/googleUser.js";
import GROUP from "../../model/group.js";
import GROUP_EXPENSE from "../../model/groupExpense.js";
import GROUP_TRANSACTION from "../../model/groupTransaction.js";
import {
  paymentStatusType,
  paymentType,
  splitTypes,
  userSchema,
  userSchemaType,
} from "../../utils/enum/index.js";
import { jsonOne, throwHttpError } from "../../utils/genrelUtils.js";
import { createGroupCode } from "../../utils/helper/index.js";
import sendMail from "../../service/sendmail.js";

//*** CREATE NEW GROUP ***//
const createGroup = async (req, res, next) => {
  try {
    await GROUP.create({
      name: req.body.name,
      groupCode: createGroupCode(),
      description: req.body.description ? req.body.description : "",
      groupCreator: req.user,
      groupMembers: [req.user],
      userModel:
        req.userType === Object.values(userSchemaType)[0]
          ? Object.values(userSchema)[0]
          : Object.values(userSchema)[1],
    });

    return jsonOne(res, HTTP.CREATED, {}, constantMessages.group.created);
  } catch (error) {
    next(error);
  }
};

const allGroupMember = async (req, res, next) => {
  try {
    const group = await GROUP.findById(req.params.groupId).select(
      "groupMembers name"
    );

    if (!group) {
      return throwHttpError(
        "not_found",
        constantMessages.group.notFound,
        HTTP.NOT_FOUND
      );
    }

    const groupMembers = await Promise.all(
      group.groupMembers.map(async (member) => {
        let user = await User.findById(member).select("name");
        if (!user) {
          user = await GoogleUser.findById(member).select("name");
        }
        return {
          memberId: member,
          name: user ? user.name : "Unknown",
        };
      })
    );

    return jsonOne(res, HTTP.SUCCESS, {
      groupName: group.name,
      groupMembers,
    });
  } catch (error) {
    next(error);
  }
};

//*** GET ALL GROUP ***//
const getAllGroup = async (req, res, next) => {
  try {
    let groups = await GROUP.find({
      groupMembers: req.user,
    }).select("name _id groupCode description groupMembers");

    if (!groups) {
      return throwHttpError(
        "not_found",
        constantMessages.group.notFound,
        HTTP.NOT_FOUND
      );
    }

    groups = await Promise.all(
      groups.map(async (group) => {
        const { groupMembers, ...groupData } = group.toObject();
        const totalExpense = await GROUP_EXPENSE.aggregate([
          {
            $match: {
              groupId: group._id,
              expense: { $ne: "Income" },
            },
          },
          {
            $group: {
              _id: "$expense",
              totalExpense: { $sum: "$amount" },
            },
          },
          {
            $project: {
              _id: 0,
              expense: "$_id",
              totalExpense: 1,
            },
          },
        ]);

        return {
          ...groupData,
          memberCount: groupMembers.length,
          totalExpense: totalExpense.reduce(
            (acc, curr) => acc + curr.totalExpense,
            0
          ),
          categoryWiseExpense: totalExpense,
        };
      })
    );

    return jsonOne(res, HTTP.SUCCESS, { groups });
  } catch (error) {
    next(error);
  }
};

//*** ADD MEMBER IN GROUP ***//
const addMemberInGroup = async (req, res, next) => {
  try {
    if (
      await GROUP.findOne({
        groupCode: req.body.groupCode,
        $or: [{ groupMembers: req.user }, { groupCreator: req.user }],
      })
    ) {
      return throwHttpError(
        "bad_request",
        constantMessages.group.alreadyExist,
        HTTP.BAD_REQUEST
      );
    }

    if (
      !(await GROUP.findOneAndUpdate(
        { groupCode: req.body.groupCode },
        { $push: { groupMembers: req.user } },
        { new: true }
      ))
    ) {
      return throwHttpError(
        "not_found",
        constantMessages.group.notFound,
        HTTP.NOT_FOUND
      );
    }

    return jsonOne(res, HTTP.SUCCESS, {}, constantMessages.group.joined);
  } catch (error) {
    next(error);
  }
};

const getAllGroupExpense = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const [allExpense, totalDocuments] = await Promise.all([
      GROUP_EXPENSE.find({
        groupId: req.params.groupId,
      })
        .select("_id expense amount paidBy date description paymentStatus")
        .skip(skip)
        .limit(limit),
      GROUP_EXPENSE.countDocuments({ groupId: req.params.groupId }),
    ]);

    if (!allExpense) {
      return throwHttpError(
        "not_found",
        constantMessages.transaction.noMoreRecords,
        HTTP.NOT_FOUND
      );
    }

    // CHECK IF NO MORE RECORDS
    if (skip >= totalDocuments) {
      return throwHttpError(
        "bad_Request",
        constantMessages.transaction.noMoreRecords,
        HTTP.BAD_REQUEST
      );
    }

    // CALCULATE TOTAL PAGES
    const totalPages = Math.ceil(totalDocuments / limit);

    const allExpenseWithNames = await Promise.all(
      allExpense.map(async (expense) => {
        let user = await User.findById(expense.paidBy).select("name");
        if (!user) {
          user = await GoogleUser.findById(expense.paidBy).select("name");
        }
        const paidByName = user ? user.name : "Unknown";
        const { paidBy, ...expenseData } = expense.toObject();
        return {
          ...expenseData,
          paidByName,
        };
      })
    );

    return jsonOne(res, HTTP.SUCCESS, {
      allExpenseWithNames,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

// const groupExpense = async (req, res, next) => {
//   try {
//     const { selectedMember, members } = req.body;

//     // Extract members and selectedMember from the nested structure
//     const memberList = members[0].selectedmembers;
//     const selectedMemberObj = selectedMember[0].memberAmounts;

//     // Validate selectedMember amounts before creating expense
//     if (req.body.splitType === Object.values(splitTypes)[1]) {
//       let totalAssignedAmount = 0;

//       Object.keys(selectedMemberObj).forEach((memberId) => {
//         const amount = parseInt(selectedMemberObj[memberId], 10);

//         if (amount > req.body.amount) {
//           return throwHttpError(
//             "bad_request",
//             "Amount cannot be greater than or less than the total amount",
//             HTTP.BAD_REQUEST
//           );
//         }
//         totalAssignedAmount += amount;
//       });

//       if (totalAssignedAmount !== parseInt(req.body.amount, 10)) {
//         return throwHttpError(
//           "bad_request",
//           "Amount cannot be greater than or less than the total amount",
//           HTTP.BAD_REQUEST
//         );
//       }
//     }

//     // Create Group Expense
//     const group = await GROUP_EXPENSE.create({
//       groupId: req.body.groupId,
//       expense: req.body.expense,
//       amount: parseInt(req.body.amount, 10),
//       paidBy: new mongoose.Types.ObjectId(req.body.paidBy),
//       splitType: req.body.splitType,
//       createdBy: req.user,
//       userModel:
//         req.userType === Object.values(userSchemaType)[0]
//           ? Object.values(userSchema)[0]
//           : Object.values(userSchema)[1],
//       paymentStatus: Object.values(paymentStatusType)[0],
//       description: req.body.description,
//       members: memberList,
//       date: new Date(req.body.date),
//     });

//     let paidUser = User.findById(new mongoose.Types.ObjectId(req.body.paidBy));

//     if (!paidUser) {
//       paidUser = await GoogleUser.findById(
//         new mongoose.Types.ObjectId(req.body.paidBy)
//       );
//     }

//     // Handle splitting logic
//     if (req.body.splitType === Object.values(splitTypes)[0]) {
//       const amount = parseInt(req.body.amount, 10) / memberList.length;

//       await Promise.all(
//         memberList.map(async (memberId) => {
//           if (memberId.toString() !== req.body.paidBy) {
//             let user = await User.findById(
//               new mongoose.Types.ObjectId(memberId)
//             );
//             if (!user) {
//               user = await GoogleUser.findById(
//                 new mongoose.Types.ObjectId(memberId)
//               );
//             }

//             if (!user || !user.email) {
//               // console.error(`Email not found for memberId: ${memberId}`);
//               return; // Skip sending email if no email is found
//             }

//             try {
//               sendMail(
//                 undefined,
//                 user.email,
//                 "expense",
//                 {
//                   user,
//                   amount,
//                   description: req.body.description,
//                   paidBy: paidUser,
//                   date: req.body.date,
//                   category: req.body.expense,
//                 },
//                 next
//               );
//             } catch (error) {
//               // Do not send a response here, as it will conflict with the main response
//               console.error("Error sending email:", error.message);
//             }
//           }

//           await GROUP_TRANSACTION.create({
//             groupExpenseId: group._id,
//             amount,
//             gets: new mongoose.Types.ObjectId(req.body.paidBy),
//             GroupId: req.body.groupId,
//             owes: new mongoose.Types.ObjectId(memberId),
//             status:
//               new mongoose.Types.ObjectId(memberId).toString() ===
//               new mongoose.Types.ObjectId(req.body.paidBy).toString()
//                 ? Object.values(paymentType)[0]
//                 : Object.values(paymentType)[1],
//           });
//         })
//       );
//     } else {
//       await Promise.all(
//         Object.keys(selectedMemberObj).map(async (memberId) => {
//           const amount = parseInt(selectedMemberObj[memberId], 10);

//           if (memberId.toString() !== req.body.paidBy) {
//             let user = await User.findById(
//               new mongoose.Types.ObjectId(memberId)
//             ).select("email name");
//             if (!user) {
//               user = await GoogleUser.findById(
//                 new mongoose.Types.ObjectId(memberId)
//               ).select("email name");
//             }

//             if (!user || !user.email) {
//               // console.error(`Email not found for memberId: ${memberId}`);
//               return; // Skip sending email if no email is found
//             }

//             try {
//               sendMail(
//                 undefined,
//                 user.email,
//                 "expense",
//                 {
//                   user,
//                   amount,
//                   description: req.body.description,
//                   paidBy: paidUser,
//                   date: req.body.date,
//                   category: req.body.expense,
//                 },
//                 next
//               );
//             } catch (error) {
//               // Do not send a response here, as it will conflict with the main response
//               console.error("Error sending email:", error.message);
//             }
//           }

//           await GROUP_TRANSACTION.create({
//             groupExpenseId: group._id,
//             amount,
//             GroupId: req.body.groupId,
//             gets: new mongoose.Types.ObjectId(req.body.paidBy),
//             owes: new mongoose.Types.ObjectId(memberId),
//             status:
//               new mongoose.Types.ObjectId(memberId).toString() ===
//               new mongoose.Types.ObjectId(req.body.paidBy).toString()
//                 ? Object.values(paymentType)[0]
//                 : Object.values(paymentType)[1],
//           });
//         })
//       );
//     }

//     return jsonOne(
//       res,
//       HTTP.SUCCESS,
//       {},
//       constantMessages.transaction.expenseAdded
//     );
//   } catch (error) {
//     next(error);
//   }
// };

const groupExpense = async (req, res, next) => {
  try {
    const {
      selectedMember,
      members,
      splitType,
      groupId,
      expense,
      amount,
      paidBy,
      description,
      date,
    } = req.body;

    // Extract members and selectedMember from the nested structure
    const memberList = members[0].selectedmembers;

    const selectedMemberObj = selectedMember[0]?.memberAmounts || {};

    // Ensure at least two members are selected
    if (!memberList || memberList.length < 2) {
      return throwHttpError(
        "bad_request",
        constantMessages.transaction.twoMember,
        HTTP.BAD_REQUEST
      );
    }

    // Ensure selectedMemberObj contains at least one valid member with an amount
    if (
      splitType === Object.values(splitTypes)[1] &&
      (!selectedMemberObj || Object.keys(selectedMemberObj).length < 2)
    ) {
      return throwHttpError(
        "bad_request",
        constantMessages.transaction.twoMember,
        HTTP.BAD_REQUEST
      );
    }

    // Validate selectedMember amounts before creating expense
    if (splitType === Object.values(splitTypes)[1]) {
      const totalAssignedAmount = Object.values(selectedMemberObj).reduce(
        (sum, memberAmount) => {
          const parsedAmount = parseInt(memberAmount, 10);
          if (parsedAmount > amount || parsedAmount <= 0) {
            return throwHttpError(
              "bad_request",
              "Amount cannot be greater than or less than the total amount",
              HTTP.BAD_REQUEST
            );
          }
          return sum + parsedAmount;
        },
        0
      );

      if (totalAssignedAmount !== parseInt(amount, 10)) {
        return throwHttpError(
          "bad_request",
          "Amount cannot be greater than or less than the total amount",
          HTTP.BAD_REQUEST
        );
      }
    }

    // Create Group Expense
    const groupExpense = await GROUP_EXPENSE.create({
      groupId,
      expense,
      amount: parseInt(amount, 10),
      paidBy: new mongoose.Types.ObjectId(paidBy),
      splitType,
      createdBy: req.user,
      userModel:
        req.userType === Object.values(userSchemaType)[0]
          ? Object.values(userSchema)[0]
          : Object.values(userSchema)[1],
      paymentStatus: Object.values(paymentStatusType)[0],
      description,
      members: memberList,
      date: new Date(date),
    });

    // Fetch paidBy user details
    const paidUser =
      (await User.findById(paidBy).select("name")) ||
      (await GoogleUser.findById(paidBy).select("name"));

    if (!paidUser) {
      return throwHttpError("not_found", "Paid user not found", HTTP.NOT_FOUND);
    }

    // Handle splitting logic
    const transactions = [];
    const emails = [];

    if (splitType === Object.values(splitTypes)[0]) {
      // Equal split
      const splitAmount = parseInt(amount, 10) / memberList.length;

      memberList.forEach((memberId) => {
        transactions.push({
          groupExpenseId: groupExpense._id,
          amount: splitAmount,
          gets: new mongoose.Types.ObjectId(paidBy),
          GroupId: groupId,
          owes: new mongoose.Types.ObjectId(memberId),
          status:
            memberId.toString() === paidBy.toString()
              ? Object.values(paymentType)[0] // Paid
              : Object.values(paymentType)[1], // Unpaid
        });

        if (memberId.toString() !== paidBy) {
          emails.push(memberId);
        }
      });
    } else {
      // Custom split
      Object.keys(selectedMemberObj).forEach((memberId) => {
        const splitAmount = parseInt(selectedMemberObj[memberId], 10);

        transactions.push({
          groupExpenseId: groupExpense._id,
          amount: splitAmount,
          GroupId: groupId,
          gets: new mongoose.Types.ObjectId(paidBy),
          owes: new mongoose.Types.ObjectId(memberId),
          status:
            memberId.toString() === paidBy.toString()
              ? Object.values(paymentType)[0] // Paid
              : Object.values(paymentType)[1], // Unpaid
        });

        if (memberId.toString() !== paidBy) {
          emails.push(memberId);
        }
      });
    }

    // Bulk insert transactions
    await GROUP_TRANSACTION.insertMany(transactions);

    // Fetch email details for all members in parallel
    const emailPromises = emails.map(async (memberId) => {
      const user =
        (await User.findById(memberId).select("email name")) ||
        (await GoogleUser.findById(memberId).select("email name"));

      if (user && user.email) {
        return {
          email: user.email,
          name: user.name,
        };
      }
      return null;
    });

    const emailDetails = (await Promise.all(emailPromises)).filter(Boolean);

    // Send emails in parallel
    emailDetails.forEach(({ email, name }) => {
      try {
        sendMail(
          undefined,
          email,
          "expense",
          {
            user: { name },
            amount,
            description,
            paidBy: paidUser.name,
            date,
            category: expense,
          },
          next
        );
      } catch (error) {
        console.error(`Error sending email to ${email}:`, error.message);
      }
    });

    return jsonOne(
      res,
      HTTP.SUCCESS,
      {},
      constantMessages.transaction.expenseAdded
    );
  } catch (error) {
    next(error);
  }
};

const expenseDitails = async (req, res, next) => {
  try {
    const groupExpense = await GROUP_EXPENSE.findById(
      req.params.expenseId
    ).select("expense amount paidBy date createdBy description");

    if (!groupExpense) {
      return throwHttpError(
        "not_found",
        constantMessages.transaction.notFound,
        HTTP.NOT_FOUND
      );
    }

    let user = await User.findById(groupExpense.paidBy).select("name");
    if (!user) {
      user = await GoogleUser.findById(groupExpense.paidBy).select("name");
    }
    const paidByName = user ? user.name : "Unknown";

    let createdBy = await User.findById(groupExpense.createdBy).select("name");
    if (!createdBy) {
      createdBy = await GoogleUser.findById(groupExpense.createdBy).select(
        "name"
      );
    }
    const createdByName = createdBy ? createdBy.name : "Unknown";

    const {
      paidBy,
      createdBy: createdByField,
      ...groupExpenseData
    } = groupExpense.toObject();

    const allExpenseWithNames = {
      ...groupExpenseData,
      paidByName,
      createdByName,
    };

    const expenseDitailes = await GROUP_TRANSACTION.find({
      groupExpenseId: req.params.expenseId,
    });

    const allExpenseDitailesWithName = await Promise.all(
      expenseDitailes.map(async (expense) => {
        let user = await User.findById(expense.owes).select("name");
        if (!user) {
          user = await GoogleUser.findById(expense.owes).select("name");
        }
        const owesName = user ? user.name : "Unknown";
        return {
          owesName,
          amount: expense.amount,
          status: expense.status,
        };
      })
    );

    return jsonOne(res, HTTP.SUCCESS, {
      allExpenseWithNames,
      allExpenseDitailesWithName,
    });
  } catch (error) {
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    if (
      !(await GROUP_EXPENSE.findByIdAndDelete({
        _id: new mongoose.Types.ObjectId(req.body.expenseId),
      }))
    ) {
      return throwHttpError(
        "not_found",
        constantMessages.transaction.notFound,
        HTTP.NOT_FOUND
      );
    }

    if (
      !(await GROUP_TRANSACTION.deleteMany({
        groupExpenseId: req.body.expenseId,
      }))
    ) {
      return throwHttpError(
        "not_found",
        constantMessages.transaction.notFound,
        HTTP.NOT_FOUND
      );
    }

    return jsonOne(res, HTTP.SUCCESS, {}, constantMessages.transaction.delete);
  } catch (error) {
    next(error);
  }
};

// const memberExpense = async (req, res, next) => {
//   try {
//     const group = await GROUP.findById(req.params.groupId).select(
//       "groupMembers"
//     );

//     if (!group) {
//       return throwHttpError(
//         "not_found",
//         constantMessages.group.notFound,
//         HTTP.NOT_FOUND
//       );
//     }

//     const totalMemberExpense = await Promise.all(
//       group.groupMembers.map(async (member) => {
//         const expenses = await GROUP_TRANSACTION.aggregate([
//           {
//             $facet: {
//               totalGets: [
//                 {
//                   $match: {
//                     $and: [
//                       { gets: new mongoose.Types.ObjectId(member) },
//                       {
//                         GroupId: new mongoose.Types.ObjectId(
//                           req.params.groupId
//                         ),
//                       },
//                       { status: Object.values(paymentType)[1] },
//                     ],
//                   },
//                 },
//                 {
//                   $group: {
//                     _id: "$owes",
//                     totalAmount: { $sum: "$amount" },
//                   },
//                 },
//                 {
//                   $project: {
//                     _id: 0,
//                     memberId: "$_id",
//                     totalAmount: 1,
//                   },
//                 },
//               ],
//               totalOwes: [
//                 {
//                   $match: {
//                     $and: [
//                       { owes: new mongoose.Types.ObjectId(member) },
//                       {
//                         GroupId: new mongoose.Types.ObjectId(
//                           req.params.groupId
//                         ),
//                       },
//                       { status: Object.values(paymentType)[1] },
//                     ],
//                   },
//                 },
//                 {
//                   $group: {
//                     _id: "$gets",
//                     totalAmount: { $sum: "$amount" },
//                   },
//                 },
//                 {
//                   $project: {
//                     _id: 0,
//                     memberId: "$_id",
//                     totalAmount: 1,
//                   },
//                 },
//               ],
//             },
//           },
//         ]);

//         let getsList = expenses[0].totalGets;
//         let owesList = expenses[0].totalOwes;

//         // Fetch member details (name, email)
//         let user = await User.findById(member).select("name email");
//         if (!user) {
//           user = await GoogleUser.findById(member).select("name email");
//         }
//         const name = user ? user.name : "Unknown";

//         // Fetch names for getsList and owesList members
//         const fetchMemberNames = async (list) => {
//           return Promise.all(
//             list.map(async (item) => {
//               let memberUser = await User.findById(item.memberId).select(
//                 "name"
//               );
//               if (!memberUser) {
//                 memberUser = await GoogleUser.findById(item.memberId).select(
//                   "name"
//                 );
//               }
//               return {
//                 ...item,
//                 name: memberUser ? memberUser.name : "Unknown",
//               };
//             })
//           );
//         };

//         getsList = await fetchMemberNames(getsList);
//         owesList = await fetchMemberNames(owesList);

//         // Calculate net amounts for getsList and owesList
//         const netGetsList = getsList
//           .map((get) => {
//             const oweEntry = owesList.find(
//               (owe) => owe.memberId.toString() === get.memberId.toString()
//             );
//             if (oweEntry) {
//               return {
//                 ...get,
//                 totalAmount: get.totalAmount - oweEntry.totalAmount,
//               };
//             }
//             return get;
//           })
//           .filter((get) => get.totalAmount > 0); // Remove entries with zero or negative amounts

//         const netOwesList = owesList
//           .map((owe) => {
//             const getEntry = getsList.find(
//               (get) => get.memberId.toString() === owe.memberId.toString()
//             );
//             if (getEntry) {
//               return {
//                 ...owe,
//                 totalAmount: owe.totalAmount - getEntry.totalAmount,
//               };
//             }
//             return owe;
//           })
//           .filter((owe) => owe.totalAmount > 0); // Remove entries with zero or negative amounts

//         // Calculate netIncomeAndExpense
//         const totalGetsAmount = netGetsList.reduce(
//           (acc, curr) => acc + curr.totalAmount,
//           0
//         );
//         const totalOwesAmount = netOwesList.reduce(
//           (acc, curr) => acc + curr.totalAmount,
//           0
//         );
//         const netIncomeAndExpense = totalGetsAmount - totalOwesAmount;

//         return {
//           memberId: member,
//           name,
//           email: user.email,
//           netIncomeAndExpense,
//           ...(netGetsList.length > 0 && { getsList: netGetsList }),
//           ...(netOwesList.length > 0 && { owesList: netOwesList }),
//         };
//       })
//     );

//     return jsonOne(res, HTTP.SUCCESS, { totalMemberExpense });
//   } catch (error) {
//     next(error);
//   }
// };

const memberExpense = async (req, res, next) => {
  try {
    const group = await GROUP.findById(req.params.groupId).select(
      "groupMembers"
    );

    if (!group) {
      return throwHttpError(
        "not_found",
        constantMessages.group.notFound,
        HTTP.NOT_FOUND
      );
    }

    const totalMemberExpense = await Promise.all(
      group.groupMembers.map(async (member) => {
        // Calculate total spent by the user in the group
        const totalSpent = await GROUP_EXPENSE.aggregate([
          {
            $match: {
              groupId: new mongoose.Types.ObjectId(req.params.groupId),
              paidBy: new mongoose.Types.ObjectId(member),
            },
          },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: "$amount" },
            },
          },
        ]);

        const totalSpentAmount =
          totalSpent.length > 0 ? totalSpent[0].totalSpent : 0;

        const expenses = await GROUP_TRANSACTION.aggregate([
          {
            $facet: {
              totalGets: [
                {
                  $match: {
                    $and: [
                      { gets: new mongoose.Types.ObjectId(member) },
                      {
                        GroupId: new mongoose.Types.ObjectId(
                          req.params.groupId
                        ),
                      },
                      { status: Object.values(paymentType)[1] },
                    ],
                  },
                },
                {
                  $group: {
                    _id: "$owes",
                    totalAmount: { $sum: "$amount" },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    memberId: "$_id",
                    totalAmount: 1,
                  },
                },
              ],
              totalOwes: [
                {
                  $match: {
                    $and: [
                      { owes: new mongoose.Types.ObjectId(member) },
                      {
                        GroupId: new mongoose.Types.ObjectId(
                          req.params.groupId
                        ),
                      },
                      { status: Object.values(paymentType)[1] },
                    ],
                  },
                },
                {
                  $group: {
                    _id: "$gets",
                    totalAmount: { $sum: "$amount" },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    memberId: "$_id",
                    totalAmount: 1,
                  },
                },
              ],
            },
          },
        ]);

        let getsList = expenses[0].totalGets;
        let owesList = expenses[0].totalOwes;

        // Fetch member details (name, email)
        let user = await User.findById(member).select("name email");
        if (!user) {
          user = await GoogleUser.findById(member).select("name email");
        }
        const name = user ? user.name : "Unknown";

        // Fetch names for getsList and owesList members
        const fetchMemberNames = async (list) => {
          return Promise.all(
            list.map(async (item) => {
              let memberUser = await User.findById(item.memberId).select(
                "name"
              );
              if (!memberUser) {
                memberUser = await GoogleUser.findById(item.memberId).select(
                  "name"
                );
              }
              return {
                ...item,
                name: memberUser ? memberUser.name : "Unknown",
              };
            })
          );
        };

        getsList = await fetchMemberNames(getsList);
        owesList = await fetchMemberNames(owesList);

        // Calculate net amounts for getsList and owesList
        const netGetsList = getsList
          .map((get) => {
            const oweEntry = owesList.find(
              (owe) => owe.memberId.toString() === get.memberId.toString()
            );
            if (oweEntry) {
              return {
                ...get,
                totalAmount: get.totalAmount - oweEntry.totalAmount,
              };
            }
            return get;
          })
          .filter((get) => get.totalAmount > 0); // Remove entries with zero or negative amounts

        const netOwesList = owesList
          .map((owe) => {
            const getEntry = getsList.find(
              (get) => get.memberId.toString() === owe.memberId.toString()
            );
            if (getEntry) {
              return {
                ...owe,
                totalAmount: owe.totalAmount - getEntry.totalAmount,
              };
            }
            return owe;
          })
          .filter((owe) => owe.totalAmount > 0); // Remove entries with zero or negative amounts

        // Calculate netIncomeAndExpense
        const totalGetsAmount = netGetsList.reduce(
          (acc, curr) => acc + curr.totalAmount,
          0
        );
        const totalOwesAmount = netOwesList.reduce(
          (acc, curr) => acc + curr.totalAmount,
          0
        );
        const netIncomeAndExpense = totalGetsAmount - totalOwesAmount;

        return {
          memberId: member,
          name,
          email: user.email,
          totalSpentAmount,
          netIncomeAndExpense,
          ...(netGetsList.length > 0 && { getsList: netGetsList }),
          ...(netOwesList.length > 0 && { owesList: netOwesList }),
        };
      })
    );

    return jsonOne(res, HTTP.SUCCESS, { totalMemberExpense });
  } catch (error) {
    next(error);
  }
};

const settlement = async (req, res, next) => {
  try {
    // Update the status of the transactions
    const updateResults = await GROUP_TRANSACTION.updateMany(
      { _id: { $in: req.body.transactionId } },
      { $set: { status: Object.values(paymentType)[0] } }
    ).lean();

    if (updateResults.matchedCount === 0) {
      return throwHttpError(
        "not_found",
        constantMessages.transaction.notFound,
        HTTP.NOT_FOUND
      );
    }

    // Check if all transactions for the related group expense are paid
    const groupExpenseIds = await GROUP_TRANSACTION.distinct("groupExpenseId", {
      _id: { $in: req.body.transactionId },
    }).lean();

    await Promise.all(
      groupExpenseIds.map(async (groupExpenseId) => {
        const unpaidTransactions = await GROUP_TRANSACTION.find({
          groupExpenseId,
          status: { $ne: Object.values(paymentType)[0] }, // Not paid
        }).lean();

        if (unpaidTransactions.length === 0) {
          // If no unpaid transactions, mark the group expense as paid
          await GROUP_EXPENSE.findByIdAndUpdate(groupExpenseId, {
            paymentStatus: Object.values(paymentStatusType)[1], // Paid
          }).lean();
        }
      })
    );

    return jsonOne(res, HTTP.SUCCESS, {}, constantMessages.transaction.updated);
  } catch (error) {
    next(error);
  }
};

// const settlementMemberData = async (req, res, next) => {
//   try {
//     const allMember = await GROUP.findById(req.params.groupId).lean();

//     if (!allMember) {
//       return throwHttpError(
//         "not_found",
//         constantMessages.group.notFound,
//         HTTP.NOT_FOUND
//       );
//     }

//     const memberList = await Promise.all(
//       allMember.groupMembers.map(async (member) => {
//         if (member.toString() !== req.user.toString()) {
//           const memberData = await GROUP_TRANSACTION.aggregate([
//             {
//               $facet: {
//                 allGetsList: [
//                   {
//                     $match: {
//                       gets: new mongoose.Types.ObjectId(req.user),
//                       owes: new mongoose.Types.ObjectId(member),
//                       status: Object.values(paymentType)[1],
//                     },
//                   },
//                   {
//                     $project: {
//                       _id: 1,
//                       amount: "$amount",
//                     },
//                   },
//                 ],
//                 allOwesList: [
//                   {
//                     $match: {
//                       owes: new mongoose.Types.ObjectId(req.user),
//                       gets: new mongoose.Types.ObjectId(member),
//                       status: Object.values(paymentType)[1],
//                     },
//                   },
//                   {
//                     $project: {
//                       _id: 1,
//                       amount: "$amount",
//                     },
//                   },
//                 ],
//               },
//             },
//           ]);

//           // Fetch member details (name, email)
//           let user = await User.findById(member).select("name email");
//           if (!user) {
//             user = await GoogleUser.findById(member).select("name email");
//           }
//           const name = user ? user.name : "Unknown";

//           return {
//             memberId: member,
//             name,
//             allGetsList: memberData[0].allGetsList,
//             allOwesList: memberData[0].allOwesList,
//           };
//         }
//       })
//     );

//     return jsonOne(res, HTTP.SUCCESS, {
//       memberList: memberList.filter(Boolean),
//     });
//   } catch (error) {
//     next(error);
//   }
// };

const settlementMemberData = async (req, res, next) => {
  try {
    const allMember = await GROUP.findById(req.params.groupId)
      .select("groupMembers")
      .lean();

    if (!allMember) {
      return throwHttpError(
        "not_found",
        constantMessages.group.notFound,
        HTTP.NOT_FOUND
      );
    }

    const memberList = await Promise.all(
      allMember.groupMembers
        .filter((member) => member.toString() !== req.user.toString())
        .map(async (member) => {
          const [allGetsList, allOwesList] = await Promise.all([
            GROUP_TRANSACTION.find({
              gets: req.user,
              owes: member,
              status: Object.values(paymentType)[1],
            })
              .select("_id amount")
              .lean(),
            GROUP_TRANSACTION.find({
              owes: req.user,
              gets: member,
              status: Object.values(paymentType)[1],
            })
              .select("_id amount")
              .lean(),
          ]);

          const user =
            (await User.findById(member).select("name email").lean()) ||
            (await GoogleUser.findById(member).select("name email").lean());

          return {
            memberId: member,
            name: user ? user.name : "Unknown",
            allGetsList,
            allOwesList,
          };
        })
    );

    return jsonOne(res, HTTP.SUCCESS, {
      memberList,
    });
  } catch (error) {
    next(error);
  }
};

const leaveGroup = async (req, res, next) => {
  try {
    const groupData = await GROUP.findOne({
      _id: req.body.groupId,
      groupMembers: req.user,
    }).lean();

    if (!groupData) {
      return throwHttpError(
        "not_found",
        constantMessages.group.notFound,
        HTTP.NOT_FOUND
      );
    }

    const expenses = await GROUP_TRANSACTION.aggregate([
      {
        $facet: {
          totalGets: [
            {
              $match: {
                gets: new mongoose.Types.ObjectId(req.user),
                GroupId: new mongoose.Types.ObjectId(req.body.groupId),
                status: Object.values(paymentType)[1],
              },
            },
            {
              $group: {
                _id: "$owes",
                totalAmount: { $sum: "$amount" },
              },
            },
            {
              $project: {
                _id: 0,
                memberId: "$_id",
                totalAmount: 1,
              },
            },
          ],
          totalOwes: [
            {
              $match: {
                owes: new mongoose.Types.ObjectId(req.user),
                GroupId: new mongoose.Types.ObjectId(req.body.groupId),
                status: Object.values(paymentType)[1],
              },
            },
            {
              $group: {
                _id: "$gets",
                totalAmount: { $sum: "$amount" },
              },
            },
            {
              $project: {
                _id: 0,
                memberId: "$_id",
                totalAmount: 1,
              },
            },
          ],
        },
      },
    ]);

    const getsList = expenses[0].totalGets;
    const owesList = expenses[0].totalOwes;

    // Check if both getsList and owesList are empty
    if (getsList.length === 0 && owesList.length === 0) {
      // Remove the user from the group
      await GROUP.findByIdAndUpdate(req.body.groupId, {
        $pull: { groupMembers: req.user },
      });

      return jsonOne(res, HTTP.SUCCESS, {}, constantMessages.group.left);
    } else {
      return throwHttpError(
        "bad_request",
        constantMessages.transaction.transactionPending,
        HTTP.BAD_REQUEST
      );
    }
  } catch (error) {
    next(error);
  }
};
export default {
  createGroup,
  getAllGroup,
  addMemberInGroup,
  settlementMemberData,
  getAllGroupExpense,
  expenseDitails,
  groupExpense,
  deleteExpense,
  allGroupMember,
  settlement,
  memberExpense,
  leaveGroup,
};
