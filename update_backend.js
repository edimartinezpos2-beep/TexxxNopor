const fs = require("fs");

const code = fs.readFileSync("backend/src/app.ts", "utf8");

const oldTarget = "    // Actualizar usuario a verificado / VIP RED\n    const updated = await prisma.user.update({\n      where: { id: userId },\n      data: { isVerified: true },\n    });\n\n    const txId = `TX-COP-${Math.floor(10000000 + Math.random() * 90000000)}`;\n    const authCode = `AUT-COL-${Math.floor(100000 + Math.random() * 900000)}`;";

const newTarget = "    // Actualizar usuario a verificado / VIP RED y VIP Status\n    const months = plan === '12_months' ? 12 : plan === '6_months' ? 6 : plan === '3_months' ? 3 : 1;\n    const expiresAt = new Date();\n    expiresAt.setMonth(expiresAt.getMonth() + months);\n\n    const txId = `TX-COP-${Math.floor(10000000 + Math.random() * 90000000)}`;\n    const authCode = `AUT-COL-${Math.floor(100000 + Math.random() * 900000)}`;\n\n    const updated = await prisma.user.update({\n      where: { id: userId },\n      data: {\n        isVerified: true,\n        isVip: true,\n        vipExpiresAt: expiresAt,\n        subscriptionPlan: plan || '1_month',\n        lastPaymentRef: txId,\n      },\n    });";


if (code.includes(oldTarget)) {
    const updatedCode = code.replace(oldTarget, newTarget);
    fs.writeFileSync("backend/src/app.ts", updatedCode, "utf8");
    console.log("Successfully updated backend/src/app.ts");
} else {
    console.log("Target not found");
    const idx = code.indexOf("Actualizar usuario a verificado / VIP RED");
    if (idx >= 0) {
        console.log("Found at index:", idx);
        console.log("Context:", code.substring(idx, idx + 300));
    }
}
