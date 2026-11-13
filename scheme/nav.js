const pages = [
  ['index.html', 'Рейки'],
  ['wires.html', 'Схема проводов'],
  ['variant3.html', 'Вариант 3'],
]
const file = location.pathname.split('/').pop() || 'index.html'
document.getElementById('views').replaceChildren(...pages.map(([href, name]) => {
  const a = document.createElement('a')
  a.href = href
  a.textContent = name
  if (file === href || (file === '' && href === 'index.html')) a.setAttribute('aria-current', 'page')
  return a
}))
