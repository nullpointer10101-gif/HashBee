const fs = require('fs');
const readline = require('readline');

async function printSteps() {
  const filePath = 'C:\\Users\\aleem\\.gemini\\antigravity\\brain\\fe5329f2-54ea-45ad-a91a-a60ececa3770\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    const obj = JSON.parse(line);
    if (obj.step_index === 2213 || obj.step_index === 2340) {
      console.log(`=== STEP ${obj.step_index} ===`);
      console.log(obj.content || obj.thinking || JSON.stringify(obj.tool_calls));
    }
  }
}

printSteps();

