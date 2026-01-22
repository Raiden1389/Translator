
const text = `Đêm ấy. Trong đại doanh tiền quân của Tào Tháo, Trương Tú một tay chống án, lông mày nhíu chặt như sâu róm, ngửa cổ nốc cạn một bầu rượu đục, hương rượu nồng nặc rót thẳng vào cuống họng, Vị cay xè nơi đầu lưỡi khiến mặt hắn méo xệch như mất sổ gạo. Hắn cố sức chớp mắt, lắc đầu nguầy nguậy để xua tan cảm giác váng đầu đang hành hạ đại não, Thở dài một tiếng não nề...
Ngước mắt nhìn lên, Thấy gã hán tử đó mình mặc giáp ngắn...`;

// Re-implementing the EXACT logic from readerFormatting.ts
function format(text) {
    let formattedPara = text;

    // Layer 1: Clean
    formattedPara = formattedPara.replace(/[ \t]+/g, ' ');

    // Layer 3: Punctuation
    formattedPara = formattedPara.replace(/"([^"]*)"/g, '“$1”');
    formattedPara = formattedPara.replace(/([.!?,])(?=[^ \d.])/g, '$1 ');

    // Layer 4: Structure Repair (The Latest List)
    const pronouns = "Hắn|Nó|Gã|Mụ|Lão|Người|Kẻ|Cô|Anh|Chị|Ông|Bà|Tên|Con|Thằng|Bọn|Lũ|Các|Những|Mọi|Mỗi|Một";
    const conjunctions = "Nhưng|Và|Thì|Mà|Bởi|Tuy|Nên|Rồi|Đã|Đang|Sẽ|Tại|Vì|Nếu|Do|Để|Với|Cùng";
    const prepositions = "Trong|Ngoài|Trên|Dưới|Trước|Sau|Lúc|Khi|Giờ";
    const verbs = "Thở|Ngước|Nhìn|Thấy|Nghe|Nói|Bảo|Hỏi|Đáp|Cười|Khóc|Đứng|Ngồi|Đi|Chạy|Đến|Về";
    const others = "Cái|Cố|Vị|Đích|Chỉ|Có|Không|Chưa|Chẳng|Biết|Nhớ|Quên|Muốn|Thích|Yêu|Ghét";

    const safeWords = `${pronouns}|${conjunctions}|${prepositions}|${verbs}|${others}`;
    const regex = new RegExp(`, (${safeWords})`, 'g');

    // Apply fix
    formattedPara = formattedPara.replace(regex, '. $1');

    return formattedPara;
}

const result = format(text);
console.log("Original: " + text);
console.log("\n------------\n");
console.log("Fixed:    " + result);

// Verification Checks
console.log("\n--- CHECKS ---");
console.log("Fix 'Vị':   " + (result.includes(". Vị") ? "PASS" : "FAIL"));
console.log("Fix 'Thở':  " + (result.includes(". Thở") ? "PASS" : "FAIL"));
console.log("Fix 'Thấy': " + (result.includes(". Thấy") ? "PASS" : "FAIL"));
