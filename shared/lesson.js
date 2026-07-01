/* Каркас урока. Строит всю общую вёрстку и логику из конфига —
   в самом файле урока остаётся только его специфика (см. lessons/*.html).
   Прогресс хранится в localStorage под ключом kod-detyam:progress.
   Две моды панели:
     - textarea (к.сборка + к.стартовыйКод): ребёнок правит текст, жмёт Запуск.
     - слоты   (к.строкиКода + к.применить): ручки прямо в коде, всё живо, без Запуска. */
(function () {
  "use strict";
  var КЛЮЧ = "kod-detyam:progress";

  function загрузитьПрогресс() { try { return JSON.parse(localStorage.getItem(КЛЮЧ) || "{}"); } catch (e) { return {}; } }
  function сохранитьПрогресс(номер) {
    try { var p = загрузитьПрогресс(); p[номер] = { готов: true, когда: Date.now() }; localStorage.setItem(КЛЮЧ, JSON.stringify(p)); } catch (e) {}
  }

  function эл(id) { return document.getElementById(id); }
  function div(cls) { var d = document.createElement("div"); d.className = cls; return d; }
  function спан(cls, текст) { var s = document.createElement("span"); s.className = cls; if (текст != null) s.textContent = текст; return s; }

  function разметка(к, инфо, следующий) {
    var название = инфо ? инфо.название : ("Урок " + к.номер);
    var следБтн = следующий
      ? '<a class="дальше" href="' + следующий.файл + '">Дальше: ' + следующий.название + ' →</a>'
      : '<a class="дальше" href="../index.html">← К программе</a>';
    var панель = к.строкиКода
      ? '<div class="панель">' +
          '<h3>Собери код</h3>' +
          '<div class="код-слоты" id="код-слоты"></div>' +
        '</div>'
      : '<div class="панель">' +
          '<h3>Меняй код</h3>' +
          '<textarea id="код" spellcheck="false"></textarea>' +
          '<div class="палитры" id="палитры"></div>' +
          '<div class="кнопки">' +
            '<button class="go" id="запуск">▶ Запуск</button>' +
            '<button class="сброс" id="сброс" title="Вернуть как было">↺</button>' +
          '</div>' +
          '<div class="ошибка" id="ошибка"></div>' +
        '</div>';
    return '' +
      '<div class="обёртка">' +
        '<a class="назад" href="../index.html">← Все уроки</a>' +
        '<header>' +
          '<span class="бейдж">УРОК ' + к.номер + '</span>' +
          '<h1>' + название + ' <span class="эмо">' + (к.значок || "") + '</span></h1>' +
          '<div class="прогресс"><div class="точки" id="точки"></div><span class="счёт" id="счёт">0/0</span></div>' +
        '</header>' +
        '<p class="интро">' + (к.интро || "") + '</p>' +
        '<div class="сетка">' +
          '<div class="рамка">' +
            '<canvas id="экран"></canvas>' +
            '<div class="оверлей" id="оверлей">' +
              '<div class="бум">🎉</div>' +
              '<h2>Урок ' + к.номер + ' пройден!</h2>' +
              '<p id="итог"></p>' +
              '<div class="далее">' + ((к.победа && к.победа.подпись) || "") + '</div>' +
              '<div class="оверлей-кнопки">' + следБтн + '<button class="ещё" id="ещё">Играть ещё</button></div>' +
            '</div>' +
          '</div>' +
          панель +
        '</div>' +
        '<div class="задания">' +
          '<h3>Задания</h3>' +
          '<div id="список"></div>' +
          '<button class="подсказать" id="подсказать">💡 Подсказка</button>' +
          '<div class="подсказка" id="подсказка"></div>' +
        '</div>' +
        '<footer>' + (к.футер || "") + '</footer>' +
      '</div>';
  }

  window.Урок = {
    создать: function (к) {
      var инфо = (window.КУРС && КУРС.урок) ? КУРС.урок(к.номер) : null;
      var следующий = (window.КУРС && КУРС.следующийГотовый) ? КУРС.следующийГотовый(к.номер) : null;
      document.title = "Урок " + к.номер + " · " + (инфо ? инфо.название : "");

      var mount = эл("урок") || document.body;
      mount.innerHTML = разметка(к, инфо, следующий);

      var canvas = эл("экран"), код = эл("код"), ошибка = эл("ошибка"), оверлей = эл("оверлей"),
          итог = эл("итог"), список = эл("список"), точкиБокс = эл("точки"), счёт = эл("счёт"),
          палитраБокс = эл("палитры"), подсказкаБокс = эл("подсказка");

      var дв = Движок.старт(canvas, к.сцена || {});
      var апи = {};
      var режимСлотов = !!к.строкиКода;

      var задания = к.задания.map(function (z) { return { текст: z.текст, подсказка: z.подсказка, проверка: z.проверка, done: false }; });
      var победили = false;

      var ряды = задания.map(function (z) {
        var r = div("ряд"); var g = div("галка"); var t = div("текст"); t.textContent = z.текст;
        r.appendChild(g); r.appendChild(t); список.appendChild(r); return { ряд: r, галка: g };
      });
      var точки = задания.map(function () { var d = div("точка"); точкиБокс.appendChild(d); return d; });

      function обновитьUI() {
        var done = 0, сл = -1;
        for (var i = 0; i < задания.length; i++) {
          if (задания[i].done) done++; else if (сл < 0) сл = i;
          ряды[i].ряд.classList.toggle("готов", задания[i].done);
          ряды[i].галка.textContent = задания[i].done ? "✓" : "";
          точки[i].classList.toggle("вкл", задания[i].done);
          ряды[i].ряд.classList.remove("следующий");
        }
        if (сл >= 0) ряды[сл].ряд.classList.add("следующий");
        счёт.textContent = done + "/" + задания.length;
        return done;
      }

      function победа() {
        if (победили) return; победили = true;
        сохранитьПрогресс(к.номер);
        var txt = (к.победа && typeof к.победа.текст === "function") ? к.победа.текст(дв.мир, апи) : (к.победа ? к.победа.текст : "Готово!");
        итог.textContent = txt;
        дв.салют(); дв.фанфары(); оверлей.classList.add("видна");
      }

      function проверить() {
        for (var i = 0; i < задания.length; i++) {
          if (!задания[i].done && задания[i].проверка(дв.мир, апи)) { задания[i].done = true; дв.пип(); }
        }
        if (обновитьUI() === задания.length) победа();
      }

      // --- режим textarea: ребёнок пишет/правит код и жмёт Запуск ---
      function построить() {
        апи = к.сборка(дв.мир, дв) || {};
        var имена = Object.keys(апи);
        var f = new Function(имена.join(","), код.value);
        f.apply(null, имена.map(function (k) { return апи[k]; }));
        if (к.читалка) дв.установитьЧиталку(к.читалка(апи));
      }
      function запустить() {
        try {
          построить();
          ошибка.classList.remove("видна");
          дв.поп(); дв.бип(); проверить();
        } catch (e) {
          ошибка.textContent = "Где-то опечатка 🙂 Нажми ↺ и попробуй ещё раз.";
          ошибка.classList.add("видна");
        }
      }
      function сброс() { код.value = к.стартовыйКод; ошибка.classList.remove("видна"); запустить(); }

      // --- режим слотов: ребёнок крутит ручки прямо в коде, всё живо ---
      var значения = {};
      function перерисовать() {
        try {
          апи = к.применить(дв.мир, дв, значения) || {};
          if (к.читалка) дв.установитьЧиталку(к.читалка(апи));
          дв.поп(); проверить();
        } catch (e) {}
      }
      function отрисоватьСлоты() {
        var бокс = эл("код-слоты");
        к.строкиКода.forEach(function (стр) { if (стр.слот) значения[стр.слот.ключ] = стр.слот.старт; });
        к.строкиКода.forEach(function (стр) {
          var строка = div("код-строка");
          строка.appendChild(спан("код-текст", стр.текст));
          var s = стр.слот;
          if (s && s.вид === "выбор") {
            var sel = document.createElement("select"); sel.className = "слот-выбор";
            s.опции.forEach(function (o) {
              var op = document.createElement("option"); op.value = o; op.textContent = o;
              if (o === значения[s.ключ]) op.selected = true;
              sel.appendChild(op);
            });
            sel.addEventListener("change", function () { значения[s.ключ] = sel.value; перерисовать(); });
            строка.appendChild(sel);
          } else if (s && s.вид === "число") {
            var обёртка = спан("слот-число");
            var minus = document.createElement("button"); minus.type = "button"; minus.className = "шаг"; minus.textContent = "−";
            var знач = спан("значение", String(значения[s.ключ]));
            var plus = document.createElement("button"); plus.type = "button"; plus.className = "шаг"; plus.textContent = "+";
            var upd = function (d) {
              var v = значения[s.ключ] + d * (s.шаг || 1);
              if (s.мин != null && v < s.мин) v = s.мин;
              if (s.макс != null && v > s.макс) v = s.макс;
              значения[s.ключ] = v; знач.textContent = String(v); перерисовать();
            };
            minus.addEventListener("click", function () { upd(-1); });
            plus.addEventListener("click", function () { upd(1); });
            обёртка.appendChild(minus); обёртка.appendChild(знач); обёртка.appendChild(plus);
            строка.appendChild(обёртка);
          }
          if (стр.хвост) строка.appendChild(спан("код-текст", стр.хвост));
          бокс.appendChild(строка);
        });
      }

      // общие кнопки (обе моды)
      эл("ещё").addEventListener("click", function () { оверлей.classList.remove("видна"); });
      эл("подсказать").addEventListener("click", function () {
        var z = null;
        for (var i = 0; i < задания.length; i++) { if (!задания[i].done) { z = задания[i]; break; } }
        подсказкаБокс.textContent = z ? ("💡 " + z.подсказка) : "💡 Всё пройдено — играй как хочешь!";
        подсказкаБокс.classList.add("видна");
      });

      if (режимСлотов) {
        отрисоватьСлоты();
        перерисовать();
      } else {
        код.value = к.стартовыйКод;
        var группыПалитр = к.палитры || (к.палитра ? [к.палитра] : []);
        группыПалитр.forEach(function (гр) {
          if (гр.подпись) { var pп = document.createElement("p"); pп.className = "палитра-подпись"; pп.textContent = гр.подпись; палитраБокс.appendChild(pп); }
          var ряд = div("палитра");
          (гр.эмодзи || []).forEach(function (e) {
            var b = document.createElement("button"); b.type = "button"; b.textContent = e;
            b.addEventListener("click", function () { код.value = гр.вставить(e, код.value); запустить(); });
            ряд.appendChild(b);
          });
          палитраБокс.appendChild(ряд);
        });
        эл("запуск").addEventListener("click", запустить);
        эл("сброс").addEventListener("click", сброс);
        построить();
      }
      обновитьUI();
    }
  };
})();
