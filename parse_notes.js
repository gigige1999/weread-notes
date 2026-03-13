const fs = require('fs');
const path = require('path');

const notesDir = __dirname;
const outputFile = path.join(notesDir, 'notes_data.json');

// 获取所有book_*.txt文件
const bookFiles = fs.readdirSync(notesDir)
  .filter(f => /^book_\d+\.txt$/.test(f))
  .sort();

console.log(`找到 ${bookFiles.length} 个笔记文件`);

const allBooks = [];

for (const file of bookFiles) {
  const content = fs.readFileSync(path.join(notesDir, file), 'utf-8');
  const lines = content.split('\n');

  // 解析书名（第一行）
  const bookTitle = lines[0].replace(/^《/, '').replace(/》$/, '').trim();

  // 解析作者（第三行，跳过空行）
  let author = '';
  let noteCountStr = '';
  let lineIdx = 1;

  // 跳过空行找到作者
  while (lineIdx < lines.length && lines[lineIdx].trim() === '') lineIdx++;
  if (lineIdx < lines.length) {
    author = lines[lineIdx].trim();
    // 检查是否有方括号包裹的国籍信息
    author = author.replace(/^\[.*?\]/, '').trim();
    lineIdx++;
  }

  // 跳过空行找到笔记数量
  while (lineIdx < lines.length && lines[lineIdx].trim() === '') lineIdx++;
  if (lineIdx < lines.length) {
    noteCountStr = lines[lineIdx].trim();
    lineIdx++;
  }

  const noteCount = parseInt(noteCountStr) || 0;

  // 解析章节和笔记内容
  const chapters = [];
  let currentChapter = null;
  let currentHighlight = '';

  for (let i = lineIdx; i < lines.length; i++) {
    const line = lines[i];

    // 跳过"来自微信读书"标记
    if (line.trim() === '-- 来自微信读书') continue;

    // 检查是否是划线标记开头
    if (line.startsWith('◆ ')) {
      // 保存之前的划线
      if (currentHighlight) {
        if (currentChapter) {
          currentChapter.highlights.push(currentHighlight.trim());
        }
      }
      currentHighlight = line.substring(2).trim();
    } else if (line.trim() === '') {
      // 空行 - 如果有正在收集的多行划线，先完成它
      if (currentHighlight) {
        if (currentChapter) {
          currentChapter.highlights.push(currentHighlight.trim());
        }
        currentHighlight = '';
      }
    } else if (!line.startsWith('◆') && currentHighlight) {
      // 多行划线的续行
      currentHighlight += '\n' + line.trim();
    } else if (line.trim() && !line.startsWith('◆')) {
      // 章节标题（非空、非划线、非续行）
      // 先保存之前的划线
      if (currentHighlight && currentChapter) {
        currentChapter.highlights.push(currentHighlight.trim());
        currentHighlight = '';
      }

      const chapterTitle = line.trim();
      currentChapter = {
        title: chapterTitle,
        highlights: []
      };
      chapters.push(currentChapter);
    }
  }

  // 保存最后一条划线
  if (currentHighlight && currentChapter) {
    currentChapter.highlights.push(currentHighlight.trim());
  }

  // 统计总划线数
  const totalHighlights = chapters.reduce((sum, ch) => sum + ch.highlights.length, 0);

  allBooks.push({
    id: allBooks.length + 1,
    title: bookTitle,
    author: author,
    noteCount: noteCount,
    highlightCount: totalHighlights,
    chapters: chapters
  });

  console.log(`  ${file}: 《${bookTitle}》 - ${author} - ${totalHighlights}条划线, ${chapters.length}个章节`);
}

// 生成汇总数据
const summary = {
  exportDate: new Date().toISOString().split('T')[0],
  totalBooks: allBooks.length,
  totalHighlights: allBooks.reduce((sum, b) => sum + b.highlightCount, 0),
  books: allBooks
};

fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2), 'utf-8');
console.log(`\n✅ 已生成结构化JSON: ${outputFile}`);
console.log(`   共 ${summary.totalBooks} 本书, ${summary.totalHighlights} 条划线`);
