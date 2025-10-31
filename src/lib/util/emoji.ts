export function generateLongEmojiStringFromRange(length: number) {
    let emojiString = '';
    // A common range for emojis is within the Supplementary Multilingual Plane (SMP)
    // Example range for various emojis
    const startCodePoint = 0x1F55B; // Grinning Face
    const endCodePoint = 0x1F566;   // Person Gesturing OK
  
    for (let i = 0; i < length; i++) {
      // Generate a random code point within the emoji range
      const randomCodePoint = Math.floor(Math.random() * (endCodePoint - startCodePoint + 1)) + startCodePoint;
      emojiString += String.fromCodePoint(randomCodePoint);
    }
    return emojiString;
  }
  
  const longEmojiString1 = generateLongEmojiStringFromRange(100); // Generates a string of 100 random emojis
  const emj = `⌛⏳⌚⏰⏱️⏲️🕰️🕛🕧🕐🕜🕑🕝🕒🕞🕓🕟🕔🕠🕕🕡🕖🕢🕗🕣🕘🕤🕙🕥🕚`
  console.log(emj.charAt(3)) //longEmojiString1);
  