# Translation and Moderation Validation Report

Date: 21/8/2026, 10:12:46 pm
NMT Model: Helsinki-NLP OPUS Bilingual Models (opus-mt-ta-en & opus-mt-hi-en)
Toxicity Model: martin-ha/toxic-comment-model (toxic-bert)
Sentiment Model: siebert/sentiment-roberta-large-english (distilbert-sst2)

## Summary Metrics
- Total Sentences Validated: 90
- Translation Success Rate: 100.0%

## Detailed Evaluation Report

| Language | Category | Original Sentence | Expected English | Model NMT Translation | Toxicity | Sentiment | Speed (ms) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Tamil | Positive | உங்கள் புகைப்படம் மிகவும் அழகாக உள்ளது. | Your photograph is very beautiful. | Your picture is beautiful. | Safe (0%) | Positive | 10133 |
| Tamil | Positive | நீ ஒரு சிறந்த நண்பன். | You are a great friend. | You're a good friend. | Safe (0%) | Positive | 11510 |
| Tamil | Positive | இந்த உணவு மிகவும் சுவையாக இருக்கிறது. | This food is very delicious. | This food is so delicious. | Safe (0%) | Positive | 6504 |
| Tamil | Positive | வாழ்த்துக்கள்! உங்கள் முயற்சி வெற்றி பெறட்டும். | Congratulations! Let your effort succeed. | Congratulations! Your efforts will be successful. | Safe (0%) | Positive | 13140 |
| Tamil | Positive | இன்று ஒரு அருமையான நாள். | Today is a wonderful day. | Today is a beautiful day. | Safe (0%) | Positive | 12613 |
| Tamil | Neutral | அவர் நாளை சென்னைக்குச் செல்கிறார். | He is going to Chennai tomorrow. | He's going to the moon. | Safe (2%) | Positive | 15670 |
| Tamil | Neutral | புத்தகம் மேசையின் மேல் உள்ளது. | The book is on the table. | The book is on the desktop. | Safe (0%) | Negative | 12626 |
| Tamil | Neutral | வகுப்பு இன்னும் பத்து நிமிடங்களில் தொடங்கும். | The class will start in ten minutes. | The class starts in ten minutes. | Safe (0%) | Positive | 14368 |
| Tamil | Neutral | இந்த கடை வார இறுதி நாட்களில் மட்டுமே திறந்திருக்கும். | This shop is open only on weekends. | Only this weekend will be open. | Safe (0%) | Positive | 16968 |
| Tamil | Neutral | மழை பெய்வது போல் தெரிகிறது. | It looks like it is raining. | It looks like raining. | Safe (0%) | Negative | 9106 |
| Tamil | Negative | எனக்கு இந்த முடிவு பிடிக்கவில்லை. | I do not like this decision. | I don't like this conclusion. | Safe (0%) | Negative | 12644 |
| Tamil | Negative | இன்று போக்குவரத்து மிகவும் மோசமாக உள்ளது. | The traffic is very bad today. | It's so bad to walk today. | Safe (1%) | Negative | 16205 |
| Tamil | Negative | என் தொலைபேசி வேலை செய்யவில்லை. | My phone is not working. | My phone didn't work. | Safe (0%) | Negative | 14263 |
| Tamil | Negative | நாம் இந்த போட்டியில் தோற்றுவிட்டோம். | We lost in this match. | We appeared in this game. | Safe (0%) | Positive | 11594 |
| Tamil | Negative | காலநிலை மிகவும் குளிராக இருக்கிறது. | The weather is very cold. | Time is too cold. | Safe (1%) | Negative | 9827 |
| Tamil | Toxic | நீ ஒரு முட்டாள், உனக்கு ஒன்றுமே தெரியாது. | You are a fool, you know nothing. | You don't know anything. | Safe (0%) | Negative | 20047 |
| Tamil | Toxic | செத்துப்போ நாயே. | Go die, dog. | Jesus Christ. | Safe (1%) | Positive | 9990 |
| Tamil | Toxic | உன்னை நான் கொன்றுவிடுவேன். | I will kill you. | I'll kill you. | Toxic (86%) | Negative | 10609 |
| Tamil | Toxic | நீ எப்போதும் ஒரு தொந்தரவு. | You are a nuisance to everyone. | You're always a problem. | Toxic (51%) | Negative | 12662 |
| Tamil | Toxic | உன் முகத்தைப் பார்க்கவே எனக்கு அருவருப்பாக இருக்கிறது. | I feel disgusted to look at your face. | I'm surprised to see your face. | Safe (0%) | Positive | 16071 |
| Tamil | Slang | மச்சான், இன்னைக்கு என்ன பிளான்? | Dude, what is the plan today? | Man, what's the game? | Safe (0%) | Neutral | 15313 |
| Tamil | Slang | அவன் சும்மா சீன் போடுறான். | He is just showing off. | He is the Most High, the Most High. | Safe (2%) | Positive | 19157 |
| Tamil | Slang | செம காமெடி பண்ணாதே. | Don't make an awesome joke. | Don't sow seed. | Safe (5%) | Positive | 12058 |
| Tamil | Slang | காசு இல்லாம செம கடுப்பாக இருக்கு. | I am very frustrated without money. | Don't worry about money. | Safe (0%) | Positive | 16526 |
| Tamil | Slang | எனக்கு மரண பசி மச்சான். | I am deadly hungry, dude. | I'm tired of dying. | Safe (19%) | Negative | 11046 |
| Tamil | Mixed | Superb பதிவு மச்சான், வாழ்த்துக்கள்! | Superb post dude, congratulations! | Superb record bag, lives! | Safe (1%) | Positive | 13018 |
| Tamil | Mixed | What a waste ஆஃப் டைம். | What a waste of time. | A.D. | Safe (0%) | Positive | 9834 |
| Tamil | Mixed | Very nice படம், எனக்கு ரொம்ப பிடிச்சிருக்கு. | Very nice movie, I liked it a lot. | You know what? | Safe (0%) | Negative | 15965 |
| Tamil | Mixed | டேய், don't do this. | Hey, don't do this. | Hey, don't do this. | Safe (2%) | Negative | 13982 |
| Tamil | Mixed | நீ பண்றது total-ஆ தப்பு. | What you are doing is totally wrong. | You're making a total mistake. | Safe (1%) | Negative | 24329 |
| Hindi | Positive | आप बहुत अच्छे इंसान हैं। | You are a very good person. | You're very good man. | Safe (0%) | Positive | 9174 |
| Hindi | Positive | यह तस्वीर बहुत सुंदर है। | This picture is very beautiful. | It's very beautiful. | Safe (0%) | Positive | 7269 |
| Hindi | Positive | आज का दिन बहुत अच्छा रहा। | Today was a very good day. | It's been great today. | Safe (0%) | Positive | 8396 |
| Hindi | Positive | मुझे आपकी बात बहुत पसंद आई। | I liked your words very much. | I love what you say. | Safe (0%) | Positive | 7465 |
| Hindi | Positive | सफलता अवश्य मिलेगी। | Success will surely come. | Of course, success. | Safe (0%) | Positive | 8564 |
| Hindi | Neutral | वहाँ एक कार खड़ी है। | A car is parked there. | There's a car standing. | Safe (0%) | Positive | 8805 |
| Hindi | Neutral | ट्रेन दस बजे आएगी। | The train will arrive at ten o'clock. | The train will arrive at ten o'clock. | Safe (0%) | Positive | 12197 |
| Hindi | Neutral | यह किताब मेज पर रखी है। | This book is kept on the table. | This book is laid on the table. | Safe (0%) | Positive | 10198 |
| Hindi | Neutral | कल छुट्टी है। | Tomorrow is a holiday. | Tomorrow's leave. | Safe (0%) | Negative | 6366 |
| Hindi | Neutral | दूध गरम है। | The milk is hot. | The milk is hot. | Safe (0%) | Positive | 6234 |
| Hindi | Negative | मुझे यह जगह पसंद नहीं आ रही है। | I am not liking this place. | I don't like this place. | Safe (2%) | Negative | 9795 |
| Hindi | Negative | आज मौसम बहुत खराब है। | The weather is very bad today. | The weather is very bad today. | Safe (0%) | Negative | 8802 |
| Hindi | Negative | मेरी गाड़ी खराब हो गई है। | My vehicle has broken down. | My car's gone. | Safe (1%) | Negative | 7247 |
| Hindi | Negative | यह रास्ता बहुत कठिन है। | This path is very difficult. | This way is very difficult. | Safe (0%) | Negative | 7254 |
| Hindi | Negative | समय बहुत कम है। | Time is very short. | The time is very short. | Safe (0%) | Negative | 7519 |
| Hindi | Toxic | तुम बिल्कुल बेवकूफ हो। | You are completely stupid. | You're a fucking idiot. | Toxic (100%) | Negative | 8974 |
| Hindi | Toxic | कोई तुम्हें पसंद नहीं करता। | Nobody likes you. | No one likes you. | Safe (42%) | Negative | 7496 |
| Hindi | Toxic | मुँह बंद रखो अपना। | Keep your mouth shut. | Shut your mouth. | Toxic (98%) | Negative | 6200 |
| Hindi | Toxic | तुम एक नंबर के झूठे हो। | You are a liar of the first order. | You're a number liars. | Toxic (96%) | Negative | 10564 |
| Hindi | Toxic | दफा हो जाओ यहाँ से। | Get lost from here. | Get lost. | Toxic (69%) | Negative | 5591 |
| Hindi | Slang | भाई, क्या चल रहा है? | Brother, what's going on? | Brother, what's going on? | Safe (0%) | Neutral | 10126 |
| Hindi | Slang | वो फालतू में हवाबाजी कर रहा है। | He is boasting for no reason. | He's flying in the fall. | Safe (0%) | Positive | 11156 |
| Hindi | Slang | चिल मार भाई, लोड मत ले। | Chill brother, don't take load. | Chill hit brother, don't take the load. | Safe (5%) | Negative | 14017 |
| Hindi | Slang | ये तो बहुत जुगाड़ू काम है। | This is a very resourceful work. | That's a lot of stuff. | Safe (0%) | Positive | 10386 |
| Hindi | Slang | उसने मुझे चूना लगा दिया। | He cheated me. | He fired me. | Safe (8%) | Negative | 10636 |
| Hindi | Mixed | Nice पोस्ट भाई, बहुत बढ़िया! | Nice post brother, very good! | Thank you very much. | Safe (0%) | Positive | 15494 |
| Hindi | Mixed | Seriously, क्या फालतू बात है। | Seriously, what nonsense. | Well, what's that? | Safe (0%) | Negative | 12682 |
| Hindi | Mixed | Happy birthday भाई, पार्टी कब है? | Happy birthday brother, when is the party? | ◆ When is the party? | Safe (0%) | Neutral | 9483 |
| Hindi | Mixed | Oh really, मुझे नहीं पता था। | Oh really, I didn't know. | Oh, I didn't know. | Safe (0%) | Negative | 13079 |
| Hindi | Mixed | ये तो total बकवास है। | This is total nonsense. | That's roll-up shit. | Toxic (97%) | Negative | 12194 |
| English | Positive | I love this community so much. | I love this community so much. | I love this community so much. | Safe (0%) | Positive | 0 |
| English | Positive | You did an amazing job on this project. | You did an amazing job on this project. | You did an amazing job on this project. | Safe (0%) | Positive | 0 |
| English | Positive | This is the best advice I have received. | This is the best advice I have received. | This is the best advice I have received. | Safe (0%) | Positive | 0 |
| English | Positive | Everything is going to be perfectly fine. | Everything is going to be perfectly fine. | Everything is going to be perfectly fine. | Safe (0%) | Positive | 0 |
| English | Positive | I am feeling so joyful and optimistic today. | I am feeling so joyful and optimistic today. | I am feeling so joyful and optimistic today. | Safe (0%) | Positive | 0 |
| English | Neutral | The weather forecast predicts rain tomorrow. | The weather forecast predicts rain tomorrow. | The weather forecast predicts rain tomorrow. | Safe (0%) | Positive | 0 |
| English | Neutral | Please submit the reports by Friday evening. | Please submit the reports by Friday evening. | Please submit the reports by Friday evening. | Safe (0%) | Positive | 0 |
| English | Neutral | I am currently reading a novel about history. | I am currently reading a novel about history. | I am currently reading a novel about history. | Safe (0%) | Positive | 0 |
| English | Neutral | The office remains closed during public holidays. | The office remains closed during public holidays. | The office remains closed during public holidays. | Safe (0%) | Negative | 0 |
| English | Neutral | He works as an engineer in a software firm. | He works as an engineer in a software firm. | He works as an engineer in a software firm. | Safe (0%) | Negative | 0 |
| English | Negative | I am really disappointed with this service. | I am really disappointed with this service. | I am really disappointed with this service. | Safe (0%) | Negative | 0 |
| English | Negative | I have a terrible headache and feel sick. | I have a terrible headache and feel sick. | I have a terrible headache and feel sick. | Safe (5%) | Negative | 0 |
| English | Negative | The system is down and nothing works. | The system is down and nothing works. | The system is down and nothing works. | Safe (0%) | Negative | 0 |
| English | Negative | This is a very sad and unfortunate situation. | This is a very sad and unfortunate situation. | This is a very sad and unfortunate situation. | Safe (0%) | Negative | 0 |
| English | Negative | We failed to reach our target this month. | We failed to reach our target this month. | We failed to reach our target this month. | Safe (0%) | Negative | 0 |
| English | Toxic | You are an absolute idiot and a loser. | You are an absolute idiot and a loser. | You are an absolute idiot and a loser. | Toxic (99%) | Negative | 0 |
| English | Toxic | Delete your account and go away forever. | Delete your account and go away forever. | Delete your account and go away forever. | Safe (20%) | Negative | 0 |
| English | Toxic | Everyone hates you and nobody wants you here. | Everyone hates you and nobody wants you here. | Everyone hates you and nobody wants you here. | Toxic (93%) | Negative | 0 |
| English | Toxic | You are worthless and completely useless. | You are worthless and completely useless. | You are worthless and completely useless. | Toxic (97%) | Negative | 0 |
| English | Toxic | Shut up, nobody cares about your opinion. | Shut up, nobody cares about your opinion. | Shut up, nobody cares about your opinion. | Toxic (92%) | Negative | 0 |
| English | Slang | Yo, that party last night was totally lit. | Yo, that party last night was totally lit. | Yo, that party last night was totally lit. | Safe (1%) | Positive | 0 |
| English | Slang | Stop capping, we all know the truth. | Stop capping, we all know the truth. | Stop capping, we all know the truth. | Safe (0%) | Positive | 0 |
| English | Slang | I am completely ghosting him from now on. | I am completely ghosting him from now on. | I am completely ghosting him from now on. | Safe (0%) | Negative | 0 |
| English | Slang | He is just throwing shade at everyone. | He is just throwing shade at everyone. | He is just throwing shade at everyone. | Safe (1%) | Negative | 0 |
| English | Slang | This movie is a total flop, don't watch it. | This movie is a total flop, don't watch it. | This movie is a total flop, don't watch it. | Safe (3%) | Negative | 0 |
| English | Mixed | Lmao, I cannot believe you actually did that. | Lmao, I cannot believe you actually did that. | Lmao, I cannot believe you actually did that. | Safe (0%) | Negative | 0 |
| English | Mixed | Congrats on the success! Huge milestones ahead. | Congrats on the success! Huge milestones ahead. | Congrats on the success! Huge milestones ahead. | Safe (0%) | Positive | 0 |
| English | Mixed | Idk what you mean by that comment tbh. | Idk what you mean by that comment tbh. | Idk what you mean by that comment tbh. | Safe (15%) | Negative | 0 |
| English | Mixed | Smh, this is getting ridiculous now. | Smh, this is getting ridiculous now. | Smh, this is getting ridiculous now. | Safe (14%) | Negative | 0 |
| English | Mixed | Fyi, we are planning a meet next week. | Fyi, we are planning a meet next week. | Fyi, we are planning a meet next week. | Safe (0%) | Positive | 0 |
