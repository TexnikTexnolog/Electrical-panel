# Схема щитов Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Одна страница, по которой собираются оба щита: при I-0-II видно, какой источник на какой клемме.

**Architecture:** Правила расключения живут в чистой функции без DOM. Страница только рисует устройства из этих данных и красит провода по результату функции. Ошибочное соединение двух источников ловит тест, а не глаз.

**Tech Stack:** HTML, CSS, JS без зависимостей и сборки. Проверка: `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-13-panel-scheme-design.md`

## Global Constraints

- Текст интерфейса на русском.
- Ноль страницы не ставит зависимости и не коммитит. Коммит только по отдельной просьбе.
- Имена источников только `grid`, `load`, `dead`. Положения только `0`, `1`, `2`.
- Колодки `n1`, `n2`, `n3` не имеют общего ребра.
- PE не проходит через SFT240 и ЗУБР.
- Щит квартиры: ряд по 18 мест. Рейка 1 занимает 16, рейка 2 занимает 17. Кондиционеры внутри ряда.
- CDA263D подписан как ПЗВ, не как дифавтомат.

## Review Focus

- Кладовка I и квартира II: обе рейки на `grid`, не на `load`. Иначе положение II выглядит как Дея, когда возврат ещё город.
- Кладовка 0: возврат, рейка 2 и розетка кладовки `dead`, рейка 1 при положении I остаётся `grid`.
- Ни одно положение не красит один узел и `grid`, и `load`.
- Между `n1`, `n2`, `n3` нет перемычки, даже когда обе рейки на городе.
- PE не меняет источник при переключении.

---

### Task 1: Модель расключения

**Files:**
- Create: `scheme/circuit.js`
- Test: `scheme/circuit.test.mjs`

**Interfaces:**
- Consumes: ничего
- Produces: `energize(storage: 0|1|2, apartment: 0|1|2) -> { rail1, rail2, storageLoads, returnPair, deyeGrid, pe, fault }`. Источники `grid|load|dead`. `pe` всегда `bonded`. `fault` строка или `null`. `barLinks()` возвращает пары соединённых колодок, ожидаемо пусто. `selfCheck()` бросает при расхождении с девятью строками таблицы спеки.

- [ ] **Step 1: Написать падающий тест**

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { energize, barLinks, selfCheck } from './circuit.js'

test('кладовка I + квартира II это город, не Load', () => {
  const s = energize(1, 2)
  assert.equal(s.rail1, 'grid')
  assert.equal(s.rail2, 'grid')
  assert.equal(s.storageLoads, 'grid')
  assert.equal(s.returnPair, 'grid')
  assert.equal(s.deyeGrid, 'grid')
  assert.equal(s.fault, null)
})

test('кладовка 0 гасит возврат и оставляет город на рейке 1', () => {
  assert.equal(energize(0, 1).rail1, 'grid')
  assert.equal(energize(0, 1).rail2, 'dead')
  assert.equal(energize(0, 2).rail1, 'dead')
  assert.equal(energize(0, 2).returnPair, 'dead')
})

test('кладовка II переводит возврат на Load', () => {
  assert.equal(energize(2, 1).rail1, 'grid')
  assert.equal(energize(2, 1).rail2, 'load')
  assert.equal(energize(2, 2).rail1, 'load')
  assert.equal(energize(2, 2).storageLoads, 'load')
})

test('колодки нуля не соединены', () => {
  assert.deepEqual(barLinks(), [])
})

test('девять положений без встречи источников, PE не переключается', () => {
  for (const storage of [0, 1, 2]) {
    for (const apartment of [0, 1, 2]) {
      const s = energize(storage, apartment)
      assert.equal(s.fault, null)
      assert.equal(s.pe, 'bonded')
    }
  }
  assert.equal(energize(1, 0).rail1, 'dead')
  assert.equal(energize(1, 0).rail2, 'grid')
  assert.equal(energize(2, 0).rail2, 'load')
  assert.doesNotThrow(() => selfCheck())
})
```

- [ ] **Step 2: Запустить тест и увидеть падение**

Run: `node --test scheme/circuit.test.mjs`  
Expected: FAIL, модуль `circuit.js` не найден.

- [ ] **Step 3: Реализовать `energize`, `barLinks`, `selfCheck` в `scheme/circuit.js`**

Город на вводе есть всегда. Порт Load под напряжением всегда. Переключатель добавляет ребро только выбранной линии. `fault` заполняется, если узел достигнут и из `grid`, и из `load`. `pe` не зависит от положений. `deyeGrid` равен `grid` при любом положении: первый автомат кладовки кормит ЗУБР помимо переключателя. `selfCheck` сверяет все девять строк таблицы спеки и пустой `barLinks()`.

- [ ] **Step 4: Запустить тест и увидеть проход**

Run: `node --test scheme/circuit.test.mjs`  
Expected: PASS, 5 тестов.

### Task 2: Оба щита на странице

**Files:**
- Create: `index.html`
- Modify: `scheme/circuit.js`
- Test: `scheme/circuit.test.mjs`

**Interfaces:**
- Consumes: `energize` из Task 1
- Produces: `devices()` со списками `apartmentRail1`, `apartmentRail2`, `storage` в порядке спеки. У гильз поле `ferrule`. Кондиционеры без `overflow`: ряд квартиры 18 мест. Страница рисует их без ручного копирования названий.

- [ ] **Step 1: Добавить в тест порядок и ширину**

```js
import { devices } from './circuit.js'

test('ширина реек', () => {
  const d = devices()
  const mods = (list) => list.reduce((n, x) => n + x.modules, 0)
  assert.equal(mods(d.apartmentRail1), 16)
  assert.equal(mods(d.apartmentRail2), 17)
  assert.equal(mods(d.storage), 12)
  assert.equal(d.apartmentRail2.at(-1).overflow, undefined)
  assert.equal(d.apartmentRail1[3].part, 'CDA263D')
})
```

- [ ] **Step 2: Запустить тест и увидеть падение**

Run: `node --test scheme/circuit.test.mjs`  
Expected: FAIL, `devices` не экспортирован.

- [ ] **Step 3: Добавить `devices()` и собрать `index.html`**

Страница модулем импортирует `devices`. Три ряда DIN, подписи из спеки, гильза текстом на автомате, ряды квартиры шириной 18 мест. CDA263D подписан «ПЗВ». На батарее подпись, что DC-автомата 200 А нет. GEN пустой. На пятёрке подпись потолка 32 А. Цвета жил: город L коричневый, город N синий, Load L оранжевый, Load N голубой, PE жёлто-зелёный, мёртвая серая. Пятёрка 5×6 между щитами подписана пятью жилами.

- [ ] **Step 4: Запустить тест**

Run: `node --test scheme/circuit.test.mjs`  
Expected: PASS, включая тест ширины.

### Task 3: Переключатели и проверка в браузере

**Files:**
- Modify: `index.html`
- Modify: `scheme/circuit.js` только если Task 3 находит дыру в `energize`

**Interfaces:**
- Consumes: `energize`, `devices`, `selfCheck`
- Produces: кнопки положений кладовки и квартиры. Выбор красит провода через `energize`. Клик по аппарату показывает его клеммы. Бейдж `selfCheck` на странице.

- [ ] **Step 1: Открыть `index.html` и пройти шесть положений**

Для каждого положения из таблицы спеки сверить цвет рейки 1, рейки 2 и кладовки. Отдельно кликнуть оба SFT240 и оба ЗУБРа: клеммы 2/6, 4/8, 1/5 и 1/2/3/4 на месте.

- [ ] **Step 2: Поправить только то положение, которое врёт относительно `energize`**

Повторно прогнать `node --test scheme/circuit.test.mjs`. Ожидание PASS. Повторить в браузере только сломанное положение.
