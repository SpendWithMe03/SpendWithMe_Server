import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import HTTP from "../../constants/httpStatusCode.js";
import GROUP from "../../model/group.js";
import GROUP_EXPENSE from "../../model/groupExpense.js";
import IncomeAndExpense from "../../model/income.js";
import { getModelByRole } from "../../utils/authUtils.js";
import { monthNames } from "../../utils/enum/index.js";
import { throwHttpErrorWithHeader } from "../../utils/genrelUtils.js";
import User from "../../model/User.js";
import GoogleUser from "../../model/googleUser.js";

const generatePDF = async (req, res, next) => {
  try {
    const { month, year } = req.body;

    const monthIndex = monthNames.indexOf(month.toLowerCase());

    if (monthIndex === -1) {
      return throwHttpErrorWithHeader(
        "bad_request",
        "Valid month name is required",
        HTTP.BAD_REQUEST,
        res // Pass the response object to set the header
      );
    }

    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 1);

    const transactions = await IncomeAndExpense.find({
      userId: new mongoose.Types.ObjectId(req.user),
      transactionDate: { $gte: startDate, $lte: endDate },
    });

    if (!transactions || transactions.length === 0) {
      return throwHttpErrorWithHeader(
        "not_found",
        "No transactions found for this month/year",
        HTTP.NOT_FOUND,
        res // Pass the response object to set the header
      );
    }

    // DETEMINE THE MODEL BASED ON THE ROLE IN THE PAYLOAD AND RETURN THE MODEL
    const Model = getModelByRole(req.userType);

    const user = await Model.findById(new mongoose.Types.ObjectId(req.user));
    if (!user) {
      return throwHttpErrorWithHeader(
        "not_found",
        "User not found",
        HTTP.NOT_FOUND,
        res
      );
    }

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=transactions-${month}-${year}.pdf`
    );
    doc.pipe(res);

    doc.rect(0, 0, doc.page.width, 80).fill("#1e40af");

    doc
      .fillColor("#ffffff")
      .fontSize(26)
      .font("Helvetica-Bold")
      .text("Financial Report", 50, 30, { align: "center" })
      .fontSize(16)
      .font("Helvetica")
      .text(
        `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`,
        50,
        55,
        { align: "center" }
      );

    doc
      .roundedRect(50, 100, doc.page.width - 100, 70, 5)
      .fillAndStroke("#f0f9ff", "#93c5fd");

    doc
      .fillColor("#0c4a6e")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Account Information", 70, 110)
      .moveDown(0.2)
      .fontSize(12)
      .font("Helvetica")
      .text(`Name: ${user.name}`, 70, 130)
      .text(`Date: ${new Date().toLocaleDateString()}`, 70, 150);

    doc
      .fontSize(10)
      .text(
        `Generated: ${new Date().toLocaleTimeString()}`,
        doc.page.width - 200,
        130
      )
      .text(
        `Document ID: ${Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase()}`,
        doc.page.width - 200,
        150
      );

    const tableTop = 190;
    let yPosition = tableTop;

    doc.roundedRect(50, yPosition - 5, 500, 30, 3).fill("#0369a1");
    doc.fillColor("#ffffff").fontSize(12).font("Helvetica-Bold");

    doc.text("Date", 70, yPosition + 7);
    doc.text("Amount", 200, yPosition + 7);
    doc.text("Category", 300, yPosition + 7);
    doc.text("Description", 400, yPosition + 7);

    yPosition += 30;

    let isAlternate = false;
    for (const transaction of transactions) {
      if (yPosition > 700) {
        doc.addPage();

        doc.rect(0, 0, doc.page.width, 40).fill("#1e40af");
        doc
          .fillColor("#ffffff")
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(`Financial Report - Continued`, 50, 15, { align: "center" });

        yPosition = 50;
        doc.roundedRect(50, yPosition - 5, 500, 30, 3).fill("#0369a1");
        doc.fillColor("#ffffff").fontSize(12).font("Helvetica-Bold");

        doc.text("Date", 70, yPosition + 7);
        doc.text("Amount", 200, yPosition + 7);
        doc.text("Category", 300, yPosition + 7);
        doc.text("Description", 400, yPosition + 7);

        yPosition += 30;
      }

      const rowColor = isAlternate ? "#f8fafc" : "#ffffff";
      doc.roundedRect(50, yPosition - 5, 500, 30, 2).fill(rowColor);

      const isIncome = transaction.category === "Income";
      const amountColor = isIncome ? "#16a34a" : "#dc2626";

      const formattedDate = new Date(
        transaction.transactionDate
      ).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const amount = Math.abs(Number(transaction.amount)).toLocaleString(
        "en-IN",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      );

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#334155")
        .text(formattedDate, 70, yPosition + 10);

      doc
        .fillColor(amountColor)
        .font("Helvetica-Bold")
        .text(` ${amount}`, 200, yPosition + 10);

      doc
        .fillColor("#334155")
        .font("Helvetica")
        .text(transaction.category || "N/A", 300, yPosition + 10)
        .text(transaction.description || "N/A", 400, yPosition + 10, {
          width: 150,
          ellipsis: true,
        });

      yPosition += 30;
      isAlternate = !isAlternate;
    }

    yPosition += 20;
    doc
      .roundedRect(50, yPosition - 5, 500, 60, 5)
      .fillAndStroke("#f0f9ff", "#93c5fd");

    const incomeTransactions = transactions.filter(
      (t) => t.category && t.category === "Income"
    );
    const expenseTransactions = transactions.filter(
      (t) => t.category && t.category !== "Income"
    );

    const incomeTotal = incomeTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );
    const expenseTotal = expenseTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );

    const totalAmount = incomeTotal - expenseTotal;

    const incomeFormatted = incomeTotal.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const expenseFormatted = expenseTotal.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const totalFormatted = totalAmount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#0c4a6e")
      .text("Transaction Summary", 70, yPosition + 5)
      .moveDown(0.3);

    doc.fontSize(11).font("Helvetica").fillColor("#334155");
    doc.text(`Total Transactions: ${transactions.length}`, 70, yPosition + 30);

    doc
      .fillColor("#16a34a")
      .text(`Total Income: ${incomeFormatted}`, 250, yPosition + 15);
    doc
      .fillColor("#dc2626")
      .text(`Total Expenses: ${expenseFormatted}`, 250, yPosition + 35);

    const netAmountColor = totalAmount >= 0 ? "#16a34a" : "#dc2626";
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(netAmountColor)
      .text(`Net Amount: ${totalFormatted}`, 400, yPosition + 25);

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#64748b")
      .text(
        `Generated on ${new Date().toISOString().split("T")[0]}`,
        50,
        doc.page.height - 50
      )
      .text("Finance Tracker App", doc.page.width - 150, doc.page.height - 50, {
        align: "right",
      });

    doc.end();
  } catch (error) {
    next(error);
  }
};

// const generateGroupPDF = async (req, res, next) => {
//   try {
//     const { month, year, groupId } = req.body;

//     const monthIndex = monthNames.indexOf(month.toLowerCase());

//     if (monthIndex === -1) {
//       return throwHttpErrorWithHeader(
//         "bad_request",
//         "Valid month name is required",
//         HTTP.BAD_REQUEST,
//         res
//       );
//     }

//     const startDate = new Date(year, monthIndex, 1);
//     const endDate = new Date(year, monthIndex + 1, 0); // Last day of month
//     const monthYear = `${
//       month.charAt(0).toUpperCase() + month.slice(1)
//     } ${year}`;

//     // Query for group transactions
//     const groupTransactions = await GROUP_EXPENSE.aggregate([
//       {
//         $match: {
//           groupId: new mongoose.Types.ObjectId(groupId),
//           date: {
//             $gte: startDate,
//             $lt: endDate,
//           },
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "paidBy",
//           foreignField: "_id",
//           as: "userPaidBy",
//         },
//       },
//       {
//         $lookup: {
//           from: "GoogleUser",
//           localField: "paidBy",
//           foreignField: "_id",
//           as: "googleUserPaidBy",
//         },
//       },
//       {
//         $sort: { date: 1 }, // Sort transactions by date
//       },
//     ]);

//     if (!groupTransactions || groupTransactions.length === 0) {
//       return throwHttpErrorWithHeader(
//         "not_found",
//         "No group transactions found for this month/year",
//         HTTP.NOT_FOUND,
//         res
//       );
//     }

//     // Get group details
//     const group = await GROUP.findById(groupId);
//     if (!group) {
//       return throwHttpErrorWithHeader(
//         "not_found",
//         "Group not found",
//         HTTP.NOT_FOUND,
//         res
//       );
//     }

//     console.log(groupTransactions);

//     // Fetch paidBy user names
//     for (const transaction of groupTransactions) {
//       // Using your requested approach for fetching user name
//       const paidUser =
//         (await User.findById(transaction.paidBy).select("name")) ||
//         (await GoogleUser.findById(transaction.paidBy).select("name"));

//       // console.log(paidUser);

//       transaction.paidByName = paidUser ? paidUser.name : "Unknown";
//     }

//     // console.log(groupTransactions);

//     // // Get group members for summary
//     // const groupMembers = await GROUP_EXPENSE.aggregate([
//     //   {
//     //     $match: { groupId: new mongoose.Types.ObjectId(groupId) },
//     //   },
//     //   {
//     //     $lookup: {
//     //       from: "users",
//     //       localField: "userId",
//     //       foreignField: "_id",
//     //       as: "userDetails",
//     //     },
//     //   },
//     //   {
//     //     $lookup: {
//     //       from: "GoogleUser",
//     //       localField: "userId",
//     //       foreignField: "_id",
//     //       as: "googleUserDetails",
//     //     },
//     //   },
//     // ]);

//     // Calculate member-wise spending
//     const memberSpending = {};
//     groupTransactions.forEach((transaction) => {
//       const paidByUser =
//         transaction.userPaidBy[0] || transaction.googleUserPaidBy[0];
//       if (paidByUser) {
//         const userId = paidByUser._id.toString();
//         const userName = paidByUser.name || paidByUser.email || "Unknown";

//         if (!memberSpending[userId]) {
//           memberSpending[userId] = {
//             name: userName,
//             total: 0,
//           };
//         }
//         memberSpending[userId].total += transaction.amount;
//       }
//     });

//     // Generate PDF
//     const doc = new PDFDocument({
//       margin: 50,
//       size: "A4",
//     });

//     // Set response headers
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=group-transactions-${month}-${year}.pdf`
//     );
//     doc.pipe(res);

//     // Add brand colors
//     const primaryColor = "#4285F4"; // Blue
//     const secondaryColor = "#34A853"; // Green
//     const lightGray = "#f8f9fa";
//     const mediumGray = "#e9ecef";
//     const darkGray = "#495057";

//     // Calculate available width for the content area
//     const pageWidth = doc.page.width;
//     const contentWidth = pageWidth - 100; // 50px margin on each side

//     // Header with logo placeholder
//     doc.roundedRect(50, 50, contentWidth, 80, 10).fill(primaryColor);

//     doc
//       .fillColor("#FFFFFF")
//       .fontSize(24)
//       .font("Helvetica-Bold")
//       .text(`${group.name}`, 70, 70);

//     doc
//       .fontSize(16)
//       .font("Helvetica")
//       .text(`Transaction Report: ${monthYear}`, 70, 100);

//     // Summary section
//     const summaryTop = 150;
//     doc
//       .roundedRect(50, summaryTop, contentWidth, 100, 5)
//       .fillColor(lightGray)
//       .fill();

//     doc
//       .fillColor(darkGray)
//       .fontSize(14)
//       .font("Helvetica-Bold")
//       .text("Summary", 70, summaryTop + 15);

//     // Calculate total amount
//     const total = groupTransactions.reduce((sum, t) => sum + t.amount, 0);

//     doc
//       .fontSize(12)
//       .font("Helvetica")
//       .text(
//         `Total Transactions: ${groupTransactions.length}`,
//         70,
//         summaryTop + 40
//       );

//     doc
//       .fontSize(14)
//       .font("Helvetica-Bold")
//       .fillColor(secondaryColor)
//       .text(`Total Amount:  ${total.toFixed(2)}`, 70, summaryTop + 65);

//     // Date range
//     doc
//       .fontSize(12)
//       .font("Helvetica")
//       .fillColor(darkGray)
//       .text(
//         `Period: ${startDate.toLocaleDateString(
//           "en-IN"
//         )} to ${endDate.toLocaleDateString("en-IN")}`,
//         pageWidth - 250,
//         summaryTop + 15
//       );

//     // Transactions Table
//     const tableTop = summaryTop + 120;
//     let yPosition = tableTop;

//     // Table headers with better styling
//     doc
//       .roundedRect(50, yPosition, contentWidth, 30, 5)
//       .fillColor(primaryColor)
//       .fill();

//     // FIXED: Adjusted column widths to fit within page boundaries
//     // New column widths distribution based on available content width
//     const dateWidth = contentWidth * 0.12; // 12% of content width
//     const descWidth = contentWidth * 0.28; // 28% of content width
//     const amountWidth = contentWidth * 0.15; // 15% of content width
//     const paidByWidth = contentWidth * 0.2; // 20% of content width
//     const splitWidth = contentWidth * 0.13; // 13% of content width
//     const statusWidth = contentWidth * 0.12; // 12% of content width

//     // Calculate actual x positions for each column
//     const dateX = 60; // Starting position
//     const descX = dateX + dateWidth;
//     const amountX = descX + descWidth;
//     const paidByX = amountX + amountWidth;
//     const splitX = paidByX + paidByWidth;
//     const statusX = splitX + splitWidth;

//     doc.fillColor("#FFFFFF").fontSize(12).font("Helvetica-Bold");

//     doc.text("Date", dateX, yPosition + 10);
//     doc.text("Description", descX, yPosition + 10);
//     doc.text("Amount", amountX, yPosition + 10);
//     doc.text("Paid By", paidByX, yPosition + 10);
//     doc.text("Split Type", splitX, yPosition + 10);
//     doc.text("Status", statusX, yPosition + 10);

//     yPosition += 35;
//     let isAlternate = false;

//     // Transactions with alternating row colors and better spacing
//     groupTransactions.forEach((transaction, index) => {
//       // Add a new page if needed
//       if (yPosition > doc.page.height - 100) {
//         doc.addPage();
//         yPosition = 50;

//         // Repeat header on new page
//         doc
//           .roundedRect(50, yPosition, contentWidth, 30, 5)
//           .fillColor(primaryColor)
//           .fill();

//         doc.fillColor("#FFFFFF").fontSize(12).font("Helvetica-Bold");

//         doc.text("Date", dateX, yPosition + 10);
//         doc.text("Description", descX, yPosition + 10);
//         doc.text("Amount", amountX, yPosition + 10);
//         doc.text("Paid By", paidByX, yPosition + 10);
//         doc.text("Split Type", splitX, yPosition + 10);
//         doc.text("Status", statusX, yPosition + 10);

//         yPosition += 35;
//         isAlternate = false;
//       }

//       // Row background
//       const rowColor = isAlternate ? mediumGray : lightGray;
//       doc
//         .roundedRect(50, yPosition - 5, contentWidth, 30, 3)
//         .fillColor(rowColor)
//         .fill();

//       // Get payer name from either user collection
//       const paidByUser =
//         transaction.userPaidBy[0] || transaction.googleUserPaidBy[0];
//       const paidByName = paidByUser
//         ? paidByUser.name || paidByUser.email
//         : "N/A";

//       // Format date nicely
//       const formattedDate = transaction.date
//         ? new Date(transaction.date).toLocaleDateString("en-IN", {
//             day: "numeric",
//             month: "short",
//           })
//         : "-";

//       // Truncate long description text
//       const description = transaction.description || "-";
//       // FIXED: Adjust truncation length based on column width
//       const truncatedDesc =
//         description.length > 20
//           ? description.substring(0, 20) + "..."
//           : description;

//       // Color-coded status
//       const status = transaction.paymentStatus || "Pending";
//       const statusColor =
//         status.toLowerCase() === "completed" ? secondaryColor : "#FFA000";

//       doc.fillColor(darkGray).fontSize(11).font("Helvetica");

//       doc.text(formattedDate, dateX, yPosition + 5, { width: dateWidth - 10 });
//       doc.text(truncatedDesc, descX, yPosition + 5, { width: descWidth - 10 });

//       doc
//         .font("Helvetica-Bold")
//         .text(`${transaction.amount.toFixed(2)}`, amountX, yPosition + 5, {
//           width: amountWidth - 10,
//         });

//       // FIXED: Truncate long names to fit within column
//       const truncatedName =
//         paidByName.length > 15
//           ? paidByName.substring(0, 15) + "..."
//           : paidByName;

//       doc.font("Helvetica").text(truncatedName, paidByX, yPosition + 5, {
//         width: paidByWidth - 10,
//       });

//       // FIXED: Truncate long split types to fit within column
//       const splitType = transaction.splitType || "Equal";
//       const truncatedSplit =
//         splitType.length > 10 ? splitType.substring(0, 10) + "..." : splitType;

//       doc.text(truncatedSplit, splitX, yPosition + 5, {
//         width: splitWidth - 10,
//       });

//       // FIXED: Ensure status is within bounds
//       doc
//         .fillColor(statusColor)
//         .text(status, statusX, yPosition + 5, { width: statusWidth - 10 });

//       yPosition += 30;
//       isAlternate = !isAlternate;
//     });

//     // Member-wise spending summary
//     if (Object.keys(memberSpending).length) {
//       // Add a new page for member spending summary if needed
//       if (yPosition > doc.page.height - 200) {
//         doc.addPage();
//         yPosition = 50;
//       } else {
//         yPosition += 20;
//       }

//       doc
//         .fillColor(primaryColor)
//         .fontSize(16)
//         .font("Helvetica-Bold")
//         .text("Member-wise Spending Summary", 50, yPosition);

//       yPosition += 20;

//       // Create pie chart data
//       const members = Object.values(memberSpending);

//       // Table for member spending
//       doc
//         .roundedRect(50, yPosition, contentWidth, 40, 5)
//         .fillColor(primaryColor)
//         .fill();

//       doc
//         .fillColor("#FFFFFF")
//         .fontSize(12)
//         .font("Helvetica-Bold")
//         .text("Member", 70, yPosition + 15);

//       doc.text("Total Spent", pageWidth - 200, yPosition + 15);

//       yPosition += 45;
//       isAlternate = false;

//       // List each member's spending
//       members.forEach((member) => {
//         const rowColor = isAlternate ? mediumGray : lightGray;
//         doc
//           .roundedRect(50, yPosition - 5, contentWidth, 30, 3)
//           .fillColor(rowColor)
//           .fill();

//         // FIXED: Truncate long member names if needed
//         const memberName = member.name;
//         const truncatedMemberName =
//           memberName.length > 30
//             ? memberName.substring(0, 30) + "..."
//             : memberName;

//         doc
//           .fillColor(darkGray)
//           .fontSize(11)
//           .font("Helvetica")
//           .text(truncatedMemberName, 70, yPosition + 5, {
//             width: contentWidth - 150,
//           });

//         doc
//           .font("Helvetica-Bold")
//           .text(`${member.total.toFixed(2)}`, pageWidth - 200, yPosition + 5);

//         yPosition += 30;
//         isAlternate = !isAlternate;
//       });
//     }

//     // Footer
//     doc
//       .fontSize(10)
//       .fillColor(darkGray)
//       .text(
//         `Generated on ${new Date().toLocaleDateString("en-IN", {
//           day: "numeric",
//           month: "long",
//           year: "numeric",
//         })}`,
//         50,
//         doc.page.height - 50,
//         { align: "center", width: contentWidth }
//       );

//     doc.end();
//   } catch (error) {
//     next(error);
//   }
// };

const generateGroupPDF = async (req, res, next) => {
  try {
    const { month, year, groupId } = req.body;

    const monthIndex = monthNames.indexOf(month.toLowerCase());

    if (monthIndex === -1) {
      return throwHttpErrorWithHeader(
        "bad_request",
        "Valid month name is required",
        HTTP.BAD_REQUEST,
        res
      );
    }

    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0); // Last day of month
    const monthYear = `${
      month.charAt(0).toUpperCase() + month.slice(1)
    } ${year}`;

    // Query for group transactions - without aggregation lookups
    const groupTransactions = await GROUP_EXPENSE.find({
      groupId: new mongoose.Types.ObjectId(groupId),
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    }).sort({ date: 1 }); // Sort transactions by date

    if (!groupTransactions || groupTransactions.length === 0) {
      return throwHttpErrorWithHeader(
        "not_found",
        "No group transactions found for this month/year",
        HTTP.NOT_FOUND,
        res
      );
    }

    // Get group details
    const group = await GROUP.findById(groupId);
    if (!group) {
      return throwHttpErrorWithHeader(
        "not_found",
        "Group not found",
        HTTP.NOT_FOUND,
        res
      );
    }

    // Fetch paidBy user names separately
    for (const transaction of groupTransactions) {
      const paidUser =
        (await User.findById(transaction.paidBy).select("name")) ||
        (await GoogleUser.findById(transaction.paidBy).select("name"));

      transaction.paidByName = paidUser ? paidUser.name : "Unknown";
    }

    // Calculate member-wise spending
    const memberSpending = {};
    groupTransactions.forEach((transaction) => {
      const userId = transaction.paidBy.toString();
      const userName = transaction.paidByName || "Unknown";

      if (!memberSpending[userId]) {
        memberSpending[userId] = {
          name: userName,
          total: 0,
        };
      }
      memberSpending[userId].total += transaction.amount;
    });

    // Generate PDF
    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
    });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=group-transactions-${month}-${year}.pdf`
    );
    doc.pipe(res);

    // Add brand colors
    const primaryColor = "#4285F4"; // Blue
    const secondaryColor = "#34A853"; // Green for completed status
    const lightGray = "#f8f9fa";
    const mediumGray = "#e9ecef";
    const darkGray = "#495057";
    const pendingColor = "#FFA000"; // Orange/Amber for pending status

    // Calculate available width for the content area
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 100; // 50px margin on each side

    // Header with logo placeholder
    doc.roundedRect(50, 50, contentWidth, 90, 10).fill(primaryColor);

    doc
      .fillColor("#FFFFFF")
      .fontSize(26)
      .font("Helvetica-Bold")
      .text(`${group.name}`, 70, 65);

    doc
      .fontSize(18)
      .font("Helvetica")
      .text(`Transaction Report: ${monthYear}`, 70, 100);

    // Summary section
    const summaryTop = 160;
    doc
      .roundedRect(50, summaryTop, contentWidth, 110, 5)
      .fillColor(lightGray)
      .fill();

    doc
      .fillColor(darkGray)
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("Summary", 70, summaryTop + 15);

    // Calculate total amount
    const total = groupTransactions.reduce((sum, t) => sum + t.amount, 0);

    doc
      .fontSize(13)
      .font("Helvetica")
      .text(
        `Total Transactions: ${groupTransactions.length}`,
        70,
        summaryTop + 45
      );

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor(secondaryColor)
      .text(`Total Amount: ${total.toFixed(2)}`, 70, summaryTop + 75);

    // Date range
    doc
      .fontSize(13)
      .font("Helvetica")
      .fillColor(darkGray)
      .text(
        `Period: ${startDate.toLocaleDateString(
          "en-IN"
        )} to ${endDate.toLocaleDateString("en-IN")}`,
        pageWidth - 280,
        summaryTop + 45
      );

    // Transactions Table
    const tableTop = summaryTop + 140;
    let yPosition = tableTop;

    // Adjusted column widths distribution to give more space to status
    const dateWidth = contentWidth * 0.12; // 12% of content width
    const descWidth = contentWidth * 0.25; // Reduced from 28% to 25%
    const amountWidth = contentWidth * 0.15; // 15% of content width
    const paidByWidth = contentWidth * 0.18; // Reduced from 20% to 18%
    const splitWidth = contentWidth * 0.12; // Reduced from 13% to 12%
    const statusWidth = contentWidth * 0.18; // Increased from 12% to 18%

    // Calculate actual x positions for each column
    const dateX = 60; // Starting position
    const descX = dateX + dateWidth;
    const amountX = descX + descWidth;
    const paidByX = amountX + amountWidth;
    const splitX = paidByX + paidByWidth;
    const statusX = splitX + splitWidth;

    // Table headers
    doc
      .roundedRect(50, yPosition, contentWidth, 35, 5)
      .fillColor(primaryColor)
      .fill();

    doc.fillColor("#FFFFFF").fontSize(13).font("Helvetica-Bold");

    doc.text("Date", dateX, yPosition + 12);
    doc.text("Description", descX, yPosition + 12);
    doc.text("Amount", amountX, yPosition + 12);
    doc.text("Paid By", paidByX, yPosition + 12);
    doc.text("Split Type", splitX, yPosition + 12);
    doc.text("Status", statusX + 10, yPosition + 12); // Added extra padding for status header

    yPosition += 40;
    let isAlternate = false;

    // Transactions with alternating row colors
    groupTransactions.forEach((transaction) => {
      // Check if we need a new page
      if (yPosition > doc.page.height - 100) {
        doc.addPage();
        yPosition = 50;

        // Repeat header on new page
        doc
          .roundedRect(50, yPosition, contentWidth, 35, 5)
          .fillColor(primaryColor)
          .fill();

        doc.fillColor("#FFFFFF").fontSize(13).font("Helvetica-Bold");

        doc.text("Date", dateX, yPosition + 12);
        doc.text("Description", descX, yPosition + 12);
        doc.text("Amount", amountX, yPosition + 12);
        doc.text("Paid By", paidByX, yPosition + 12);
        doc.text("Split Type", splitX, yPosition + 12);
        doc.text("Status", statusX + 10, yPosition + 12); // Added extra padding

        yPosition += 40;
        isAlternate = false;
      }

      const rowColor = isAlternate ? mediumGray : lightGray;
      doc
        .roundedRect(50, yPosition - 5, contentWidth, 32, 3)
        .fillColor(rowColor)
        .fill();

      const formattedDate = transaction.date
        ? new Date(transaction.date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })
        : "-";

      const paidByName = transaction.paidByName || "N/A";
      const splitType = transaction.splitType || "Equal";
      const status = transaction.paymentStatus || "Pending";

      // Apply status color based on status
      const statusColor =
        status.toLowerCase() === "completed" ? secondaryColor : pendingColor;

      doc.fillColor(darkGray).fontSize(12).font("Helvetica");

      // Render transaction details with truncation for long text
      doc.text(formattedDate, dateX, yPosition + 8, { width: dateWidth - 10 });

      const description = transaction.description || "-";
      const truncatedDesc =
        description.length > 18
          ? description.substring(0, 18) + "..."
          : description;
      doc.text(truncatedDesc, descX, yPosition + 8, { width: descWidth - 10 });

      doc.text(`${transaction.amount.toFixed(2)}`, amountX, yPosition + 8, {
        width: amountWidth - 10,
      });

      const truncatedName =
        paidByName.length > 12
          ? paidByName.substring(0, 12) + "..."
          : paidByName;
      doc.text(truncatedName, paidByX, yPosition + 8, {
        width: paidByWidth - 10,
      });

      const truncatedSplit =
        splitType.length > 8 ? splitType.substring(0, 8) + "..." : splitType;
      doc.text(truncatedSplit, splitX, yPosition + 8, {
        width: splitWidth - 10,
      });

      // Apply the proper status color and increased spacing/padding
      doc
        .fillColor(statusColor)
        .font("Helvetica-Bold")
        .text(status, statusX + 10, yPosition + 8, {
          // Added extra padding
          width: statusWidth - 10,
        });

      yPosition += 32;
      isAlternate = !isAlternate;
    });

    // Member-wise Spending Summary
    if (Object.keys(memberSpending).length) {
      // Add a new page for member spending summary if needed
      if (yPosition > doc.page.height - 200) {
        doc.addPage();
        yPosition = 50;
      } else {
        yPosition += 30;
      }

      doc
        .fillColor(primaryColor)
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("Member-wise Spending Summary", 50, yPosition);

      yPosition += 25;

      // Table for member spending
      doc
        .roundedRect(50, yPosition, contentWidth, 40, 5)
        .fillColor(primaryColor)
        .fill();

      doc
        .fillColor("#FFFFFF")
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Member", 70, yPosition + 15);

      doc.text("Total Spent", pageWidth - 200, yPosition + 15);

      yPosition += 45;
      isAlternate = false;

      // List each member's spending
      Object.values(memberSpending).forEach((member) => {
        const rowColor = isAlternate ? mediumGray : lightGray;
        doc
          .roundedRect(50, yPosition - 5, contentWidth, 35, 3)
          .fillColor(rowColor)
          .fill();

        const memberName = member.name;
        const truncatedMemberName =
          memberName.length > 30
            ? memberName.substring(0, 30) + "..."
            : memberName;

        doc
          .fillColor(darkGray)
          .fontSize(12)
          .font("Helvetica")
          .text(truncatedMemberName, 70, yPosition + 10, {
            width: contentWidth - 150,
          });

        doc
          .font("Helvetica-Bold")
          .text(`${member.total.toFixed(2)}`, pageWidth - 200, yPosition + 10);

        yPosition += 35;
        isAlternate = !isAlternate;
      });
    }

    // Add a footer with page numbers
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Add footer text
      doc
        .fillColor(darkGray)
        .fontSize(10)
        .font("Helvetica")
        .text(
          `Generated on: ${new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}`,
          50,
          doc.page.height - 50
        );

      // Add page number
      doc.text(
        `Page ${i + 1} of ${totalPages}`,
        pageWidth - 120,
        doc.page.height - 50
      );
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};
export default { generatePDF, generateGroupPDF };
