---
name: chinese-vietnamese-translator
description: |
  Dịch tiểu thuyết Trung -> Việt chất lượng cao cho AI Translator.
  Ưu tiên glossary/corrections, giữ xưng hô Ta/Ngươi cho 我/你, Hắn/Nàng cho ngôi 3,
  chống sót Hán tự, chống văn convert, và bắt buộc chạy rewrite pass trước khi output.
skills: []
---

# Chinese -> Vietnamese Translator

## 0. Mục tiêu

Dịch tiểu thuyết mạng Trung Quốc sang tiếng Việt tự nhiên, rõ nghĩa, đúng thuật ngữ và ổn định xuyên chương. Bản dịch phải đọc như tiếng Việt đã biên tập, không như convert Hán văn, không tự thêm ý, không bỏ ý.

Mục tiêu chất lượng:
- Trung thành với nghĩa, quan hệ nhân vật, POV, diễn biến.
- Văn Việt mượt, có chủ thể khi cần, không lậm cấu trúc Trung.
- Không sót chữ Hán.
- Không tự bịa thuật ngữ hoặc thay nhân vật.
- Không meta talk, không ghi chú, không giải thích ngoài bản dịch.

## 1. Priority Bắt Buộc

Khi có conflict, áp dụng thứ tự sau:

```text
1. Glossary từ inbox/task
2. Corrections từ inbox/task
3. Rules trong SKILL.md này
4. config.prompt
5. AI judgment
```

Rules:
- Glossary có `translated` thì copy đúng nguyên dạng, gồm hoa/thường và dấu.
- Corrections là bản vá task-specific, không được bỏ qua.
- Nếu `config.prompt` mâu thuẫn với bridge contract hoặc rules ở đây, ưu tiên bridge contract và SKILL.
- Không bịa tên, không thay nhân vật hoặc thuật ngữ chưa chắc bằng mục khác trong glossary.

## 2. Translation Mode

Không dịch word-by-word. Luôn xử lý theo thứ tự:

1. Hiểu cảnh: ai đang làm gì, nói với ai, cảm xúc gì, POV đang ở đâu.
2. Chốt chủ thể: câu này cần giữ tên, dùng hắn/nàng, hay có thể ẩn chủ ngữ.
3. Chốt thuật ngữ: glossary/corrections trước, sau đó mới tự dịch.
4. Viết lại thành câu Việt tự nhiên, nhưng không thêm ý.
5. Đọc lại như biên tập viên: nếu còn mùi convert, sửa tối thiểu tại chỗ trước khi output.

Nguyên tắc:
- Dịch theo nghĩa và chức năng câu, không bám thứ tự chữ Trung nếu sang Việt bị gượng.
- Có thể tách/gộp câu nhẹ nếu cần để tiếng Việt tự nhiên, nhưng không được bỏ ý.
- Nếu câu Trung mơ hồ, giữ mức mơ hồ tương đương, không tự giải thích.
- Nếu câu Việt nghe như Hán văn đổi chữ, bản đó chưa đạt.

## 3. Xưng Hô Và Ngôi Kể

### 3.1 Hard Mapping

| Source | Dịch mặc định | Phạm vi |
|---|---|---|
| 我 | ta | đối thoại, độc thoại, nội tâm trực tiếp |
| 你 | ngươi | đối thoại hoặc lời gọi trực tiếp |
| 他 | hắn | trần thuật ngôi 3 nam |
| 她 | nàng | trần thuật ngôi 3 nữ |
| 他们 | bọn họ / họ | theo ngữ cảnh |
| 她们 | các nàng / họ | theo ngữ cảnh |

Rules:
- Trong thoại, mặc định `我 -> ta`, `你 -> ngươi`.
- Trong nội tâm trực tiếp của nhân vật, dùng `ta` nếu source là `我`.
- Trong trần thuật ngôi 3, dùng `hắn/nàng` khi cần rõ chủ thể.
- Viết thường `ta`, `ngươi`, `hắn`, `nàng` giữa câu; viết hoa ở đầu câu hoặc đầu thoại.
- Không biến `哥哥/姐姐/叔叔/阿姨` thành xưng hô tùy tiện nếu source đang là cách gọi thân mật/tước vị. Dịch theo vai trò hoặc glossary.

### 3.2 Từ Cấm Theo Ngữ Cảnh

Cấm dùng sai ngôi:
- Trong thoại: `tôi`, `anh`, `em`, `bạn`, `cậu`, `mình` nếu không có chỉ định đặc biệt trong glossary/corrections.
- Trong trần thuật ngôi 3: `mình`, `của mình` nếu nó làm lệch POV.
- Không dùng `huynh`, `muội`, `tỷ`, `đệ` làm xưng hô fallback nếu source không yêu cầu và glossary không khóa.

Ví dụ:
- Sai: `Anh mệt rồi phải không?`
- Đúng: `Ngươi mệt rồi phải không?`
- Sai: `kỹ năng của mình`
- Đúng: `kỹ năng của ta` trong nội tâm trực tiếp, hoặc bỏ sở hữu nếu trần thuật đã rõ.

## 4. Tên Riêng, Thuật Ngữ, Skill

Rules:
- Tên nhân vật Hán: phiên âm Hán Việt hoặc theo glossary.
- Tên Tây viết bằng Hán tự: chỉ khôi phục tên tiếng Anh khi thật sự chắc. Nếu không chắc, giữ một cách phiên âm ổn định.
- Tên kỹ năng, công pháp, item, phe phái, địa danh: theo glossary trước; nếu không có glossary thì dịch nhất quán xuyên task.
- Skill trong ngoặc vuông dùng Title Case: `[Liệt Hỏa Xung Kích]`, `[Mắt Nhìn Thấu]`.
- Dòng hệ thống/game dùng sentence case tự nhiên: `[Hệ thống nhắc nhở: ...]`.
- Tiêu đề chương dùng format `Chương X: ...`, không Hán tự, không ALL CAPS, không Title Case máy móc.

## 5. Không Sót Hán Tự

Tuyệt đối không để sót chữ Hán trong title hoặc content, trừ khi source là ký hiệu bắt buộc và glossary yêu cầu giữ.

Nếu gặp thuật ngữ chưa biết:
- Đoán theo ngữ cảnh nếu đủ chắc.
- Nếu là tên riêng, phiên âm Hán Việt nhất quán.
- Nếu không chắc, chọn bản dịch an toàn, không ghi chú, không giải thích ngoài văn bản.

## 6. Convert Kill List

Khi gặp các pattern sau, phải ưu tiên rewrite sang tiếng Việt tự nhiên:

### 6.1 Cụm tâm lý convert

- `心中/心里 + động từ/cảm xúc` không dịch máy thành `trong lòng...` nếu có cách tự nhiên hơn.
- Sai: `trong lòng nảy sinh nghi hoặc`
- Đúng: `hắn bắt đầu nghi ngờ`
- Sai: `trong lòng thầm nghĩ`
- Đúng: `hắn thầm nghĩ` hoặc `hắn nghĩ bụng`
- Sai: `kinh hãi trong lòng`
- Đúng: `hắn giật mình`, `hắn hoảng hốt`

### 6.2 Động từ rỗng

- `进行 + danh từ` -> đổi thành động từ Việt.
- Sai: `tiến hành kiểm tra`
- Đúng: `kiểm tra`
- Sai: `tiến hành công kích`
- Đúng: `tấn công`

### 6.3 Cấu trúc đệm Hán văn

- `对于X来说` -> `với X`, hoặc viết lại cả câu.
- Sai: `đối với hắn mà nói, chuyện này không khó`
- Đúng: `với hắn, chuyện này không khó`
- Tốt hơn nếu ngữ cảnh cho phép: `chuyện này chẳng làm khó được hắn`

- `可以看出/由此可见` -> bỏ hoặc đổi thành kết luận tự nhiên.
- Sai: `có thể thấy rằng hắn rất tức giận`
- Đúng: `rõ ràng hắn đang rất tức giận`
- Tốt hơn: `hắn đang giận thật rồi`

### 6.4 Từ mơ hồ bị lạm dụng

Chỉ dùng `dường như`, `tựa hồ`, `bất giác`, `không khỏi` khi source thật sự cần sắc thái đó. Nếu chỉ là đệm, bỏ.

- Sai: `hắn không khỏi nhìn sang`
- Đúng: `hắn nhìn sang`
- Sai: `nàng bất giác lùi lại`
- Đúng: `nàng vô thức lùi lại` nếu đúng nghĩa; nếu không, `nàng lùi lại`
- Sai: `dường như hắn đã hiểu`
- Đúng: `hắn có vẻ đã hiểu` nếu bất định; nếu chắc thì `hắn đã hiểu`

### 6.5 Collocation máy

- Sai: `công việc độ khó cao`
- Đúng: `việc khó như vậy`
- Sai: `phương tiện loại ô tô`
- Đúng: `ô tô`, `xe hơi`, `phương tiện`
- Sai: `trạng thái cơ thể`
- Đúng: `thể trạng`, `tình trạng cơ thể`
- Sai: `bàn chông`
- Đúng: `bẫy chông`

### 6.6 Lặp ý, lặp từ, từ thừa

- Sai: `ngoài ra ngoài`
- Đúng: `bên ngoài`
- Sai: `thầm lẩm bẩm`
- Đúng: `lẩm bẩm` hoặc `thầm nói`
- Sai: `theo dấu đánh dấu`
- Đúng: `lần theo dấu trên bản đồ`
- Sai: `nhiệm vụ khó chỉ mức C+`
- Đúng: `nhiệm vụ chỉ có độ khó C+`

### 6.7 Mở lời literal

Không dịch `我这里/我这边` thành `ta ở đây/ta bên này` nếu không nói vị trí thật.

- Sai: `ta ở đây tình cờ có một nhiệm vụ`
- Đúng: `ta tình cờ có một nhiệm vụ`
- Đúng hơn theo thoại: `ta có một nhiệm vụ, chắc ngươi sẽ hứng thú`

## 7. Văn Phong Tự Nhiên

Ưu tiên tiếng Việt tự nhiên, rõ cảnh, rõ chủ thể, không bám cấu trúc Trung một cách máy móc.

Rules:
- Câu hành động phải rõ ai làm nếu scene có nhiều nhân vật.
- Có thể ẩn chủ ngữ nếu chủ thể đã rõ và câu Việt vẫn tự nhiên.
- Tránh chuỗi động tác vô chủ ngữ dài.
- Tránh Hán Việt sống nếu có từ Việt tự nhiên hơn.
- Đối thoại phải nghe như nhân vật đang nói, không như diễn văn.
- Nội tâm phải gọn, trực tiếp, không lạm dụng `trong lòng`.

## 8. Độ Trung Thành

Rules:
- Dịch đủ tiêu đề và nội dung. Không bỏ sót đoạn, câu, ý.
- Không tự thêm diễn giải, ghi chú, meta talk, lời xin lỗi, hoặc bình luận.
- Không thay đổi quan hệ nhân vật.
- Không đổi POV.
- Không kéo tên, thuật ngữ, hoặc tình tiết từ chương trước vào chương hiện tại nếu source hiện tại không hỗ trợ.
- Có thể ẩn chủ ngữ nếu tiếng Việt vẫn rõ và tự nhiên; nếu mơ hồ hoặc scene đông người, thêm chủ thể tối thiểu.

## 9. Few-Shot Chuẩn

Các ví dụ dưới đây là chuẩn phong cách. Nội hóa pattern, không copy máy móc.

### 9.1 Thoại Ta/Ngươi, tự nhiên nhưng không sến

Source:
```text
“程文哥，你昨晚累坏了吧？讨厌，小心我打你哦！”
```

Sai:
```text
"Anh Trình Văn, tối qua anh mệt lắm đúng không? Ghét anh quá, cẩn thận em đánh anh đó!"
```

Đúng:
```text
"Trình Văn ca, tối qua ngươi mệt lắm phải không? Đáng ghét, cẩn thận ta đánh ngươi đó!"
```

Lý do:
- `你 -> ngươi`, `我 -> ta`.
- Giữ sắc thái trêu chọc, nhưng không dùng anh/em.

### 9.2 Nội tâm trực tiếp không dùng "mình"

Source:
```text
他低头看着掌心，心想：我这次应该赌对了。
```

Sai:
```text
Hắn cúi đầu nhìn lòng bàn tay, trong lòng nghĩ: mình lần này chắc đã cược đúng.
```

Đúng:
```text
Hắn cúi đầu nhìn lòng bàn tay, thầm nghĩ: lần này ta cược đúng rồi.
```

Lý do:
- Nội tâm trực tiếp dùng `ta`.
- Bỏ `trong lòng nghĩ` convert.

### 9.3 Trần thuật hành động tránh câu cụt gượng

Source:
```text
方恒皱了皱眉，转身走进三号别墅。
```

Sai:
```text
Khẽ nhíu mày, xoay người đi vào biệt thự số 3.
```

Đúng:
```text
Phương Hằng nhíu mày, xoay người bước vào biệt thự số 3.
```

Lý do:
- Scene cần chủ thể rõ.
- `bước vào` tự nhiên hơn `đi vào` trong câu này.

### 9.4 Cụm tâm lý phải rewrite

Source:
```text
听到这句话，赵烈心中顿时生出警惕。
```

Sai:
```text
Nghe câu này, trong lòng Triệu Liệt lập tức nảy sinh cảnh giác.
```

Đúng:
```text
Nghe vậy, Triệu Liệt lập tức cảnh giác.
```

Lý do:
- Không cần `trong lòng`.
- `lập tức cảnh giác` gọn và tự nhiên.

### 9.5 Đừng lạm dụng "dường như/tựa hồ"

Source:
```text
他似乎明白了对方的意思。
```

Đúng nếu bất định:
```text
Hắn có vẻ đã hiểu ý đối phương.
```

Sai nếu source chắc chắn ở câu sau:
```text
Hắn dường như đã hiểu ý đối phương.
```

Đúng khi ngữ cảnh xác nhận:
```text
Hắn đã hiểu ý đối phương.
```

Lý do:
- `似乎` không phải lúc nào cũng cần `dường như`; đọc ngữ cảnh để chọn mức chắc.

### 9.6 Skill, item, hệ thống/game

Source:
```text
【系统提示：你已激活技能“烈火冲击”。】
```

Sai:
```text
[hệ thống nhắc nhở: ngươi đã kích hoạt kỹ năng "liệt hỏa xung kích".]
```

Đúng:
```text
[Hệ thống nhắc nhở: ngươi đã kích hoạt kỹ năng [Liệt Hỏa Xung Kích].]
```

Lý do:
- Dòng hệ thống sentence case.
- Skill Title Case trong `[]`.
- `你 -> ngươi`.

### 9.7 Glossary thắng suy đoán

Glossary:
```text
黑塔 = Hắc Tháp
守夜人 = Người Gác Đêm
```

Source:
```text
黑塔的守夜人已经到了。
```

Sai:
```text
Người canh đêm của Tháp Đen đã tới.
```

Đúng:
```text
Người Gác Đêm của Hắc Tháp đã tới.
```

Lý do:
- Glossary phải copy đúng nguyên dạng.

### 9.8 Mở lời "ta ở đây" phải phá literal

Source:
```text
我这里刚好有个任务，你应该会感兴趣。
```

Sai:
```text
Ta ở đây vừa hay có một nhiệm vụ, ngươi hẳn sẽ có hứng thú.
```

Đúng:
```text
Ta vừa hay có một nhiệm vụ, chắc ngươi sẽ hứng thú.
```

Lý do:
- `我这里` không nói vị trí thật.
- Câu thoại cần gọn, tự nhiên.

### 9.9 Đối với X mà nói

Source:
```text
对于现在的他来说，这点危险根本不算什么。
```

Sai:
```text
Đối với hắn hiện tại mà nói, chút nguy hiểm này căn bản không tính là gì.
```

Đúng:
```text
Với hắn hiện giờ, chút nguy hiểm này chẳng đáng kể.
```

Lý do:
- Phá cấu trúc `đối với... mà nói`.
- `căn bản không tính là gì` -> `chẳng đáng kể`.

### 9.10 Không thêm ý để làm văn

Source:
```text
门外传来脚步声。
```

Sai:
```text
Ngoài cửa vang lên tiếng bước chân dồn dập, khiến bầu không khí trở nên căng thẳng.
```

Đúng:
```text
Ngoài cửa vang lên tiếng bước chân.
```

Lý do:
- Không tự thêm `dồn dập`, không thêm không khí căng thẳng nếu source không có.

## 10. Before Output Rewrite Pass

Trước khi output mỗi chương, đọc lại từng đoạn như biên tập viên tiếng Việt:

1. Câu nào nghe như dịch máy thì viết lại.
2. Câu nào thiếu chủ thể gây mơ hồ thì thêm chủ thể tối thiểu.
3. Câu nào lặp từ/cụm nghĩa thì rút gọn.
4. Câu nào dùng Hán Việt sống thì đổi sang tiếng Việt tự nhiên.
5. Câu nào dùng `trong lòng`, `dường như`, `tựa hồ`, `bất giác`, `không khỏi`, `đối với... mà nói`, `tiến hành...` thì kiểm tra lại, chỉ giữ nếu thật sự cần.
6. Câu thoại nào lọt anh/em/tôi/mình/bạn/cậu sai ngôi thì sửa.
7. Skill, item, tên riêng, địa danh phải khớp glossary/corrections.
8. Không đánh bóng quá đà, không đổi nghĩa, không thêm tình tiết.

Nếu bản dịch đã tự nhiên và đúng nghĩa, không sửa chỉ để khác đi.

## 11. Format Output

Trong Bridge workflow, bản dịch được ghi vào JSON outbox theo workflow `/dich`. Nội dung `title` và `content` phải là text dịch sạch.

Rules:
- Không markdown.
- Không code fence.
- Không ghi chú.
- Không giải thích lựa chọn dịch.
- Không để title xuống dòng.
- Giữ paragraph breaks hợp lý theo source.

## 12. Quality Gate Trước Khi Output

Trước khi ghi mỗi chương, tự quét:
- Đã áp dụng Translation Mode chưa?
- Đã nội hóa Few-Shot Chuẩn chưa?
- Đã chạy Before Output Rewrite Pass chưa?
- Title đúng `Chương X: ...`, không Hán tự.
- Content không còn chữ Hán.
- Glossary/corrections đã áp dụng đúng.
- Không nhầm nhân vật, không đổi POV.
- Trong thoại không lọt `anh/em/tôi/mình/bạn/cậu` sai ngôi.
- Trần thuật ngôi 3 không lọt `mình/của mình` sai POV.
- Skill trong `[]` viết Title Case nếu là tên skill.
- Dòng hệ thống/game giữ format ổn định.
- Không còn blacklist convert rõ ràng.
- Không còn từ thừa, lặp từ sát nhau, typo dễ thấy.
- Không có meta talk hoặc nội dung ngoài bản dịch.

Nếu fail:
- Sửa tối thiểu đúng chỗ lỗi.
- Không rewrite cả chương nếu nghĩa không sai.
