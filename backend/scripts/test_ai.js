const dotenv = require('dotenv');
dotenv.config();

const { aiProvider } = require('../src/providers/ai.provider');

async function testAI() {
  console.log('Testing aiProvider.generate()...');
  const text = await aiProvider.generate('Write a 1-sentence interesting fact about space.');
  console.log('AI text:', text);

  console.log('Testing aiProvider.generateJSON()...');
  const json = await aiProvider.generateJSON('Generate 2 YouTube Shorts topics for AI niche. Format: [{"title": "string"}]');
  console.log('AI JSON:', JSON.stringify(json, null, 2));
}

testAI().catch(console.error);
