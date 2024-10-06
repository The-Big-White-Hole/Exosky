const canvas = document.getElementById("loadingCanvas");
const ctx = canvas.getContext("2d");
let stars = [];
const maxStars = 400; // Увеличено количество звезд до 4000

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Инициализация прогресса
let progress = 0;

// Получаем элементы прогресс-бара
const progressFill = document.getElementById("progressFill");

// Вычисляем максимальное расстояние, которое требуется звезде, чтобы выйти за пределы экрана
const maxDistance = Math.sqrt(Math.pow(canvas.width / 2, 2) + Math.pow(canvas.height / 2, 2)) + 100;

// Функция для создания новой звезды с равномерным распределением
function createStar(initial = false) {
  const angle = Math.random() * Math.PI * 2;
  const speed = Math.random() * 2 + 0.5; // Скорость звезды
  const radius = Math.random() * 1.5 + 0.5; // Радиус звезды
  const distance = initial ? Math.random() * maxDistance : 0; // Начальное расстояние

  return {
    x: canvas.width / 2 + Math.cos(angle) * distance,
    y: canvas.height / 2 + Math.sin(angle) * distance,
    angle: angle,
    speed: speed,
    radius: radius,
    color: `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`
  };
}

// Создание начальных звезд с равномерным распределением
for (let i = 0; i < maxStars; i++) {
  // Для равномерного распределения звезд по всему экрану, устанавливаем некоторые из них уже находящимися в полете
  const initial = Math.random() > 0.5; // 50% звезд уже в полете
  stars.push(createStar(initial));
}

// Функция для обновления анимации
function update() {
  // Эмулируем увеличение загрузки
  progress += Math.random() * 0.2; // Уменьшил скорость прогресса для плавности
  if (progress > 100) progress = 100;

  // Обновляем прогресс-бар
  progressFill.style.width = progress + "%";
  progressFill.textContent = Math.floor(progress) + "%";

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Устанавливаем цвет по умолчанию
  // ctx.fillStyle = "white"; // Убрано, используем индивидуальные цвета для звезд

  stars.forEach((star, index) => {
    // Скорость уменьшается в зависимости от прогресса загрузки
    const speedFactor = 1 - progress / 100;
    const velocityX = Math.cos(star.angle) * star.speed * speedFactor;
    const velocityY = Math.sin(star.angle) * star.speed * speedFactor;
    star.x += velocityX;
    star.y += velocityY;

    // Рисуем звезду
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = star.color;
    ctx.fill();

    // Проверяем, вышла ли звезда за пределы экрана с запасом
    if (
      star.x < -50 || star.x > canvas.width + 50 ||
      star.y < -50 || star.y > canvas.height + 50
    ) {
      // Перезапускаем звезду из центра
      stars[index] = createStar();
    }
  });

  // Если загрузка не завершена, продолжаем анимацию
  if (progress < 100) {
    requestAnimationFrame(update);
  } else {
    // После завершения загрузки можно скрыть лоадер
    setTimeout(() => {
      canvas.style.display = 'none';
      document.getElementById("progressContainer").style.display = 'none';
      // Здесь можно добавить дальнейшую логику после загрузки
    }, 500); // Немного задержки для плавного завершения
  }
}

// Запускаем анимацию
update();

// Адаптация размера холста при изменении размера окна
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Перезапускаем все звезды из центра при изменении размера
  stars = [];
  for (let i = 0; i < maxStars; i++) {
    // Снова распределяем звезды равномерно
    const initial = Math.random() > 0.5;
    stars.push(createStar(initial));
  }
});
