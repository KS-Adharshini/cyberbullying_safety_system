const tamilTestSentences = [
  // Positive (5)
  { text: "உங்கள் புகைப்படம் மிகவும் அழகாக உள்ளது.", expected: "Your photograph is very beautiful.", category: "Positive" },
  { text: "நீ ஒரு சிறந்த நண்பன்.", expected: "You are a great friend.", category: "Positive" },
  { text: "இந்த உணவு மிகவும் சுவையாக இருக்கிறது.", expected: "This food is very delicious.", category: "Positive" },
  { text: "வாழ்த்துக்கள்! உங்கள் முயற்சி வெற்றி பெறட்டும்.", expected: "Congratulations! Let your effort succeed.", category: "Positive" },
  { text: "இன்று ஒரு அருமையான நாள்.", expected: "Today is a wonderful day.", category: "Positive" },

  // Neutral (5)
  { text: "அவர் நாளை சென்னைக்குச் செல்கிறார்.", expected: "He is going to Chennai tomorrow.", category: "Neutral" },
  { text: "புத்தகம் மேசையின் மேல் உள்ளது.", expected: "The book is on the table.", category: "Neutral" },
  { text: "வகுப்பு இன்னும் பத்து நிமிடங்களில் தொடங்கும்.", expected: "The class will start in ten minutes.", category: "Neutral" },
  { text: "இந்த கடை வார இறுதி நாட்களில் மட்டுமே திறந்திருக்கும்.", expected: "This shop is open only on weekends.", category: "Neutral" },
  { text: "மழை பெய்வது போல் தெரிகிறது.", expected: "It looks like it is raining.", category: "Neutral" },

  // Negative (5)
  { text: "எனக்கு இந்த முடிவு பிடிக்கவில்லை.", expected: "I do not like this decision.", category: "Negative" },
  { text: "இன்று போக்குவரத்து மிகவும் மோசமாக உள்ளது.", expected: "The traffic is very bad today.", category: "Negative" },
  { text: "என் தொலைபேசி வேலை செய்யவில்லை.", expected: "My phone is not working.", category: "Negative" },
  { text: "நாம் இந்த போட்டியில் தோற்றுவிட்டோம்.", expected: "We lost in this match.", category: "Negative" },
  { text: "காலநிலை மிகவும் குளிராக இருக்கிறது.", expected: "The weather is very cold.", category: "Negative" },

  // Toxic (5)
  { text: "நீ ஒரு முட்டாள், உனக்கு ஒன்றுமே தெரியாது.", expected: "You are a fool, you know nothing.", category: "Toxic" },
  { text: "செத்துப்போ நாயே.", expected: "Go die, dog.", category: "Toxic" },
  { text: "உன்னை நான் கொன்றுவிடுவேன்.", expected: "I will kill you.", category: "Toxic" },
  { text: "நீ எப்போதும் ஒரு தொந்தரவு.", expected: "You are a nuisance to everyone.", category: "Toxic" },
  { text: "உன் முகத்தைப் பார்க்கவே எனக்கு அருவருப்பாக இருக்கிறது.", expected: "I feel disgusted to look at your face.", category: "Toxic" },

  // Slang (5)
  { text: "மச்சான், இன்னைக்கு என்ன பிளான்?", expected: "Dude, what is the plan today?", category: "Slang" },
  { text: "அவன் சும்மா சீன் போடுறான்.", expected: "He is just showing off.", category: "Slang" },
  { text: "செம காமெடி பண்ணாதே.", expected: "Don't make an awesome joke.", category: "Slang" },
  { text: "காசு இல்லாம செம கடுப்பாக இருக்கு.", expected: "I am very frustrated without money.", category: "Slang" },
  { text: "எனக்கு மரண பசி மச்சான்.", expected: "I am deadly hungry, dude.", category: "Slang" },

  // Mixed Social Media (5)
  { text: "Superb பதிவு மச்சான், வாழ்த்துக்கள்!", expected: "Superb post dude, congratulations!", category: "Mixed" },
  { text: "What a waste ஆஃப் டைம்.", expected: "What a waste of time.", category: "Mixed" },
  { text: "Very nice படம், எனக்கு ரொம்ப பிடிச்சிருக்கு.", expected: "Very nice movie, I liked it a lot.", category: "Mixed" },
  { text: "டேய், don't do this.", expected: "Hey, don't do this.", category: "Mixed" },
  { text: "நீ பண்றது total-ஆ தப்பு.", expected: "What you are doing is totally wrong.", category: "Mixed" }
];

const hindiTestSentences = [
  // Positive (5)
  { text: "आप बहुत अच्छे इंसान हैं।", expected: "You are a very good person.", category: "Positive" },
  { text: "यह तस्वीर बहुत सुंदर है।", expected: "This picture is very beautiful.", category: "Positive" },
  { text: "आज का दिन बहुत अच्छा रहा।", expected: "Today was a very good day.", category: "Positive" },
  { text: "मुझे आपकी बात बहुत पसंद आई।", expected: "I liked your words very much.", category: "Positive" },
  { text: "सफलता अवश्य मिलेगी।", expected: "Success will surely come.", category: "Positive" },

  // Neutral (5)
  { text: "वहाँ एक कार खड़ी है।", expected: "A car is parked there.", category: "Neutral" },
  { text: "ट्रेन दस बजे आएगी।", expected: "The train will arrive at ten o'clock.", category: "Neutral" },
  { text: "यह किताब मेज पर रखी है।", expected: "This book is kept on the table.", category: "Neutral" },
  { text: "कल छुट्टी है।", expected: "Tomorrow is a holiday.", category: "Neutral" },
  { text: "दूध गरम है।", expected: "The milk is hot.", category: "Neutral" },

  // Negative (5)
  { text: "मुझे यह जगह पसंद नहीं आ रही है।", expected: "I am not liking this place.", category: "Negative" },
  { text: "आज मौसम बहुत खराब है।", expected: "The weather is very bad today.", category: "Negative" },
  { text: "मेरी गाड़ी खराब हो गई है।", expected: "My vehicle has broken down.", category: "Negative" },
  { text: "यह रास्ता बहुत कठिन है।", expected: "This path is very difficult.", category: "Negative" },
  { text: "समय बहुत कम है।", expected: "Time is very short.", category: "Negative" },

  // Toxic (5)
  { text: "तुम बिल्कुल बेवकूफ हो।", expected: "You are completely stupid.", category: "Toxic" },
  { text: "कोई तुम्हें पसंद नहीं करता।", expected: "Nobody likes you.", category: "Toxic" },
  { text: "मुँह बंद रखो अपना।", expected: "Keep your mouth shut.", category: "Toxic" },
  { text: "तुम एक नंबर के झूठे हो।", expected: "You are a liar of the first order.", category: "Toxic" },
  { text: "दफा हो जाओ यहाँ से।", expected: "Get lost from here.", category: "Toxic" },

  // Slang (5)
  { text: "भाई, क्या चल रहा है?", expected: "Brother, what's going on?", category: "Slang" },
  { text: "वो फालतू में हवाबाजी कर रहा है।", expected: "He is boasting for no reason.", category: "Slang" },
  { text: "चिल मार भाई, लोड मत ले।", expected: "Chill brother, don't take load.", category: "Slang" },
  { text: "ये तो बहुत जुगाड़ू काम है।", expected: "This is a very resourceful work.", category: "Slang" },
  { text: "उसने मुझे चूना लगा दिया।", expected: "He cheated me.", category: "Slang" },

  // Mixed Social Media (5)
  { text: "Nice पोस्ट भाई, बहुत बढ़िया!", expected: "Nice post brother, very good!", category: "Mixed" },
  { text: "Seriously, क्या फालतू बात है।", expected: "Seriously, what nonsense.", category: "Mixed" },
  { text: "Happy birthday भाई, पार्टी कब है?", expected: "Happy birthday brother, when is the party?", category: "Mixed" },
  { text: "Oh really, मुझे नहीं पता था।", expected: "Oh really, I didn't know.", category: "Mixed" },
  { text: "ये तो total बकवास है।", expected: "This is total nonsense.", category: "Mixed" }
];

const englishTestSentences = [
  // Positive (5)
  { text: "I love this community so much.", expected: "I love this community so much.", category: "Positive" },
  { text: "You did an amazing job on this project.", expected: "You did an amazing job on this project.", category: "Positive" },
  { text: "This is the best advice I have received.", expected: "This is the best advice I have received.", category: "Positive" },
  { text: "Everything is going to be perfectly fine.", expected: "Everything is going to be perfectly fine.", category: "Positive" },
  { text: "I am feeling so joyful and optimistic today.", expected: "I am feeling so joyful and optimistic today.", category: "Positive" },

  // Neutral (5)
  { text: "The weather forecast predicts rain tomorrow.", expected: "The weather forecast predicts rain tomorrow.", category: "Neutral" },
  { text: "Please submit the reports by Friday evening.", expected: "Please submit the reports by Friday evening.", category: "Neutral" },
  { text: "I am currently reading a novel about history.", expected: "I am currently reading a novel about history.", category: "Neutral" },
  { text: "The office remains closed during public holidays.", expected: "The office remains closed during public holidays.", category: "Neutral" },
  { text: "He works as an engineer in a software firm.", expected: "He works as an engineer in a software firm.", category: "Neutral" },

  // Negative (5)
  { text: "I am really disappointed with this service.", expected: "I am really disappointed with this service.", category: "Negative" },
  { text: "I have a terrible headache and feel sick.", expected: "I have a terrible headache and feel sick.", category: "Negative" },
  { text: "The system is down and nothing works.", expected: "The system is down and nothing works.", category: "Negative" },
  { text: "This is a very sad and unfortunate situation.", expected: "This is a very sad and unfortunate situation.", category: "Negative" },
  { text: "We failed to reach our target this month.", expected: "We failed to reach our target this month.", category: "Negative" },

  // Toxic (5)
  { text: "You are an absolute idiot and a loser.", expected: "You are an absolute idiot and a loser.", category: "Toxic" },
  { text: "Delete your account and go away forever.", expected: "Delete your account and go away forever.", category: "Toxic" },
  { text: "Everyone hates you and nobody wants you here.", expected: "Everyone hates you and nobody wants you here.", category: "Toxic" },
  { text: "You are worthless and completely useless.", expected: "You are worthless and completely useless.", category: "Toxic" },
  { text: "Shut up, nobody cares about your opinion.", expected: "Shut up, nobody cares about your opinion.", category: "Toxic" },

  // Slang (5)
  { text: "Yo, that party last night was totally lit.", expected: "Yo, that party last night was totally lit.", category: "Slang" },
  { text: "Stop capping, we all know the truth.", expected: "Stop capping, we all know the truth.", category: "Slang" },
  { text: "I am completely ghosting him from now on.", expected: "I am completely ghosting him from now on.", category: "Slang" },
  { text: "He is just throwing shade at everyone.", expected: "He is just throwing shade at everyone.", category: "Slang" },
  { text: "This movie is a total flop, don't watch it.", expected: "This movie is a total flop, don't watch it.", category: "Slang" },

  // Mixed Social Media (5)
  { text: "Lmao, I cannot believe you actually did that.", expected: "Lmao, I cannot believe you actually did that.", category: "Mixed" },
  { text: "Congrats on the success! Huge milestones ahead.", expected: "Congrats on the success! Huge milestones ahead.", category: "Mixed" },
  { text: "Idk what you mean by that comment tbh.", expected: "Idk what you mean by that comment tbh.", category: "Mixed" },
  { text: "Smh, this is getting ridiculous now.", expected: "Smh, this is getting ridiculous now.", category: "Mixed" },
  { text: "Fyi, we are planning a meet next week.", expected: "Fyi, we are planning a meet next week.", category: "Mixed" }
];

export {
  tamilTestSentences,
  hindiTestSentences,
  englishTestSentences
};
