import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';

export default async function handler(req, res) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://pwonlyias.com/prelims-previous-years-paper/indian-polity/');

  const questions = await page.evaluate(() => {
    const questionElems = document.querySelectorAll('.your-question-selector'); // Replace with correct selector
    const optionsElems = document.querySelectorAll('.your-options-selector'); // Replace with correct selector
    const data = [];

    questionElems.forEach((q, i) => {
      const questionText = q.innerText;
      const options = Array.from(optionsElems[i].querySelectorAll('.option-class')).map(option => option.innerText); // Adjust the class
      data.push({
        question: questionText,
        options: options
      });
    });
    return data;
  });

  await browser.close();

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Indian Polity MCQs');

  worksheet.columns = [
    { header: 'Question', key: 'question', width: 50 },
    { header: 'Option A', key: 'optionA', width: 20 },
    { header: 'Option B', key: 'optionB', width: 20 },
    { header: 'Option C', key: 'optionC', width: 20 },
    { header: 'Option D', key: 'optionD', width: 20 }
  ];

  questions.forEach((q) => {
    worksheet.addRow({
      question: q.question,
      optionA: q.options[0],
      optionB: q.options[1],
      optionC: q.options[2],
      optionD: q.options[3]
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Indian_Polity_MCQ.xlsx');

  await workbook.xlsx.write(res);
}
