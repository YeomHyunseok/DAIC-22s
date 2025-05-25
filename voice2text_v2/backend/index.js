require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const OpenAI = require('openai');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path; // 다른 컴퓨터에서도 설치나 환경변수 설정 없이 바로 실행 가능
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const port = 5000;

app.use(cors());

const upload = multer({ dest: 'uploads/' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const audioPath = req.file.path;
    const wavPath = audioPath + '.wav';

    // webm → wav 변환
    await new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .toFormat('wav')
        .on('end', resolve)
        .on('error', reject)
        .save(wavPath);
    });

    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavPath),
      model: 'whisper-1',
      language: 'ko',
      response_format: 'json',
    });

    fs.unlinkSync(audioPath); // 임시 파일 삭제
    fs.unlinkSync(wavPath);   // 변환 파일 삭제
    res.json({ text: response.text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
}); 