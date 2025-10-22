const display = document.getElementById('display');
const quoteBox = document.getElementById('quoteBox');

const quotes = [
  "Imagination is more important than knowledge. – Albert Einstein",
  "Science is the poetry of reality. – Richard Dawkins",
  "Somewhere, something incredible is waiting to be known. – Carl Sagan",
  "If I have seen further, it is by standing on the shoulders of giants. – Isaac Newton",
  "The good thing about science is that it’s true whether or not you believe in it. – Neil deGrasse Tyson",
  "Research is what I’m doing when I don’t know what I’m doing. – Wernher von Braun",
  "We cannot solve problems with the same thinking we used when we created them. – Albert Einstein",
  "Equipped with his five senses, man explores the universe around him. – Edwin Hubble",
  "Science knows no country, because knowledge belongs to humanity. – Louis Pasteur",
  "Wonder is the beginning of wisdom. – Socrates"
];

// Rotate quotes every 7 seconds
let quoteIndex = 0;
setInterval(() => {
  quoteIndex = (quoteIndex + 1) % quotes.length;
  quoteBox.style.opacity = 0;
  setTimeout(() => {
    quoteBox.textContent = quotes[quoteIndex];
    quoteBox.style.opacity = 1;
  }, 500);
}, 7000);

function appendChar(char) {
  display.value += char;
}

function clearDisplay() {
  display.value = '';
}

function deleteChar() {
  display.value = display.value.slice(0, -1);
}

function calculate() {
  try {
    let expression = display.value
      .replace(/\^/g, '')
      .replace(/√/g, 'Math.sqrt')
      .replace(/log10/g, 'Math.log10');

    if (expression.includes('!')) {
      expression = handleFactorial(expression);
    }

    display.value = eval(expression);
  } catch {
    display.value = 'Error';
  }
}

function handleFactorial(expr) {
  return expr.replace(/(\d+)!/g, (_, n) => factorial(parseInt(n)));
}
const quoteElement = document.querySelector('.quote');
quoteElement.classList.remove('show');
setTimeout(() => {
  quoteElement.textContent = newQuote;
  quoteElement.classList.add('show');
}, 300);

function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}