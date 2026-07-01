/* Каркас урока. Строит всю общую вёрстку и логику из конфига —
   в самом файле урока остаётся только его специфика (см. lessons/*.html).
   Прогресс хранится в localStorage под ключом kod-detyam:progress. */
(function () {
  "use strict";
  var КЛЮЧ = "kod-detyam:progress";

  function загрузитьПрогресс() { try { return JSON.parse(localStorage.getItem(КЛЮЧ) || "{}"); } catch (e) { return {}; } }
  function сохранитьПрогресс(номер) {
    try { var p = загрузитьПрогресс(); p[номер] = { готов: true, когда: Date.now() }; localStorage.setItem(КЛЮЧ, JSON.stringify(p)); } catch (e) {}
  }

  function экр(текст) { var d = document.createElement("div"); d.innerHTML = текст; return d; }
  function эл(id) { return document.getElementById(id); }
  function div(cls) { var d = document.createElement("div"); d.className = cls; return d; }

  function разметка(к, инфо, следующий) {
    var название = инфо ? инфо.название : ("Урок " + к.номер);
    var следБтн = следующий
      ? '<a class="дальше" href="' + следующий.файл + '">Дальше: ' + следующий.название + ' →</a>'
      : '<a class="дальше" href="../index.html">← К программе</a>';
    var подписьПалитры = (к.палитра && к.палитра.подпись) ? '<p class="палитра-подпись">' + к.палитра.подпись + '</p>' : '';
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
          '<div class="панель">' +
            '<h3>Меняй код</h3>' +
            '<textarea id="код" spellcheck="false"></textarea>' +
            подписьПалитры +
            '<div class="палитра" id="палитра"></div>' +
            '<div class="кнопки">' +
              '<button class="go" id="запуск">▶ Запуск</button>' +
              '<button class="сброс" id="сброс" title="Вернуть как было">↺</button>' +
            '</div>' +
            '<div class="ошибка" id="ошибка"></div>' +
          '</div>' +
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
          палитраБокс = эл("палитра"), подсказкаБокс = эл("подсказка");

      var дв = Движок.старт(canvas, к.сцена || {});
      var апи = {};

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

      function построить() {
        апи = к.сборка(дв.мир) || {};
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

      код.value = к.стартовыйКод;

      (к.палитра && к.палитра.эмодзи ? к.палитра.эмодзи : []).forEach(function (e) {
        var b = document.createElement("button"); b.type = "button"; b.textContent = e;
        b.addEventListener("click", function () { код.value = к.палитра.вставить(e, код.value); запустить(); });
        палитраБокс.appendChild(b);
      });

      эл("запуск").addEventListener("click", запустить);
      эл("сброс").addEventListener("click", сброс);
      эл("ещё").addEventListener("click", function () { оверлей.classList.remove("видна"); });
      эл("подсказать").addEventListener("click", function () {
        var z = null;
        for (var i = 0; i < задания.length; i++) { if (!задания[i].done) { z = задания[i]; break; } }
        подсказкаБокс.textContent = z ? ("💡 " + z.подсказка) : "💡 Всё пройдено — играй как хочешь!";
        подсказкаБокс.classList.add("видна");
      });

      построить();
      обновитьUI();
    }
  };
})();
