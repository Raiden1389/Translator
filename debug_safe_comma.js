
const testCases = [
    "vào trong cuống họng, Cái vị cay nồng (User Text - Should Split)",
    "có chút vặn vẹo, Cố sức chớp mắt (User Text - Should Split)",
    "Chào, Lan. (Proper Name - Should KEEP Comma)",
    "Tôi đi du lịch Anh, Pháp, Mỹ. (List of Countries - Should KEEP Comma)",
    "Tuy nhiên, Hắn vẫn không chịu. (Pronoun - Should Split)",
];

function applyAggressive(text) {
    return text.replace(/, ([A-ZĂÂÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴĐ])/g, '. $1');
}

function applySafe(text) {
    // Only split for common sentence starters/pronouns
    // Cái, Cố, Hắn, Nhưng, Và, Thì, Mà, Bởi, Tuy, Nên, Rồi, Đã, Đang, Sẽ, Người, Kẻ, Gã, Mụ, Lão, Cô, Anh, Chị, Ông, Bà...
    // Note: "Anh", "Chị", "Ông", "Bà" are tricky because they can be proper nouns or pronouns. 
    // Let's stick to the ones in the User's text first: Cái, Cố, Hắn, Nhưng, Tuy, Tại, Vì...
    const safeWords = "Cái|Cố|Hắn|Nhưng|Và|Thì|Mà|Bởi|Tuy|Nên|Rồi|Đã|Đang|Sẽ|Người|Kẻ|Gã|Mụ|Lão|Tại|Vì|Nếu";
    const regex = new RegExp(`, (${safeWords})`, 'g');
    return text.replace(regex, '. $1');
}

console.log("--- TEST RESULTS ---");
testCases.forEach(text => {
    console.log(`\nInput:    ${text}`);
    console.log(`Aggressive: ${applyAggressive(text)}`);
    console.log(`Safe Mode:  ${applySafe(text)}`);
});
