/* Движок урока: холст, игровой цикл, спрайты, линейка координат, звук, конфетти.
   Общий для всех уроков — подключается один раз, не дублируется по файлам.
   Урок вызывает Движок.старт(canvas, {фон, линейка}) и получает объект с миром и методами. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.Движок = {
    старт: function (canvas, опции) {
      опции = опции || {};
      var ctx = canvas.getContext("2d");
      var W = 480, H = 480, ГОР = 330;
      var dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var звёзды = [];
      if (опции.фон === "космос") {
        for (var i = 0; i < 46; i++) звёзды.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + 0.4, a: Math.random() * 0.5 + 0.2 });
      }

      var мир = {
        объекты: [],
        очистить: function () { this.объекты.length = 0; },
        добавить: function (о) { this.объекты.push(о); return о; }
      };

      var popT = -1, конфетти = [], AC = null, читалкаТекст = "";
      var цвета = ["#FBBF24", "#F472B6", "#34D399", "#60A5FA", "#FB7185", "#A78BFA"];

      function поп() { popT = performance.now(); }
      function салют() {
        if (reduce) return;
        конфетти = [];
        for (var k = 0; k < 90; k++) конфетти.push({ x: W / 2, y: H / 2, vx: (Math.random() - 0.5) * 9, vy: (Math.random() - 0.7) * 9, r: Math.random() * 5 + 3, c: цвета[k % цвета.length], life: 1 });
      }
      function звук(freqs, dur) {
        dur = dur || 0.12;
        try {
          AC = AC || new (window.AudioContext || window.webkitAudioContext)();
          var t = AC.currentTime;
          for (var j = 0; j < freqs.length; j++) {
            var o = AC.createOscillator(), g = AC.createGain();
            o.type = "triangle"; o.frequency.value = freqs[j];
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur); t += dur * 0.9;
          }
        } catch (e) {}
      }

      function линейка() {
        if (!опции.линейка) return;
        var светлая = опции.линейка === "светлая";
        ctx.save(); ctx.lineWidth = 1;
        ctx.strokeStyle = светлая ? "rgba(199,210,254,0.16)" : "rgba(30,30,70,0.15)";
        ctx.font = '11px system-ui,sans-serif';
        var шаги = [100, 200, 300, 400], n, v;
        for (n = 0; n < шаги.length; n++) {
          v = шаги[n];
          ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, H); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, v); ctx.lineTo(W, v); ctx.stroke();
          ctx.fillStyle = светлая ? "rgba(199,210,254,0.6)" : "rgba(30,30,70,0.5)";
          ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(String(v), v, 4);
          ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(String(v), 5, v);
        }
        ctx.fillStyle = светлая ? "rgba(199,210,254,0.9)" : "rgba(30,30,70,0.72)";
        ctx.font = 'bold 11px system-ui,sans-serif'; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("→ вправо", 7, 21); ctx.fillText("↓ вниз", 7, 35);
        ctx.restore();
      }

      function кадр(now) {
        ctx.clearRect(0, 0, W, H);
        if (опции.фон === "мир") {
          var s = ctx.createLinearGradient(0, 0, 0, ГОР); s.addColorStop(0, "#7EC8FF"); s.addColorStop(1, "#CDEEFF");
          ctx.fillStyle = s; ctx.fillRect(0, 0, W, ГОР);
          var gr = ctx.createLinearGradient(0, ГОР, 0, H); gr.addColorStop(0, "#82CC6C"); gr.addColorStop(1, "#57A64B");
          ctx.fillStyle = gr; ctx.fillRect(0, ГОР, W, H - ГОР);
        } else {
          var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#312E81"); g.addColorStop(1, "#1E1B4B");
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          for (var si = 0; si < звёзды.length; si++) {
            var z = звёзды[si];
            ctx.globalAlpha = z.a; ctx.fillStyle = "#C7D2FE";
            ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        линейка();

        var scale = 1;
        if (!reduce && popT > 0) {
          var t = (now - popT) / 1000;
          if (t < 0.6) { scale = 1 + 0.25 * Math.exp(-6 * t) * Math.cos(16 * t); } else { popT = -1; }
        }
        ctx.save();
        ctx.translate(W / 2, H / 2); ctx.scale(scale, scale); ctx.translate(-W / 2, -H / 2);
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (var i2 = 0; i2 < мир.объекты.length; i2++) {
          var o = мир.объекты[i2];
          var bob = reduce ? 0 : Math.sin(now / 500 + i2 * 1.3) * 3;
          ctx.font = (Math.max(6, Number(o.размер) || 6)) + 'px system-ui,"Segoe UI Emoji","Apple Color Emoji",sans-serif';
          ctx.fillText(String(o.картинка), Number(o.вправо) || 0, (Number(o.вниз) || 0) + bob);
        }
        ctx.restore();

        if (читалкаТекст) {
          ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          ctx.font = 'bold 13px system-ui,sans-serif'; ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.fillText(читалкаТекст, W / 2, H - 8); ctx.restore();
        }

        if (конфетти.length) {
          for (var c = 0; c < конфетти.length; c++) {
            var p = конфетти[c];
            p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life -= 0.012;
            ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
          }
          ctx.globalAlpha = 1;
          конфетти = конфетти.filter(function (q) { return q.life > 0 && q.y < H + 20; });
        }

        requestAnimationFrame(кадр);
      }
      requestAnimationFrame(кадр);

      return {
        мир: мир, W: W, H: H,
        поп: поп, салют: салют,
        бип: function () { звук([660]); },
        пип: function () { звук([880], 0.1); },
        фанфары: function () { звук([523, 659, 784, 1047], 0.16); },
        установитьЧиталку: function (txt) { читалкаТекст = txt || ""; }
      };
    }
  };
})();
