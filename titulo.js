/* =====================================================================
   Abertura estilo GBA — tudo desenhado em pixel art, nada de imagem.
   Resolução interna baixa (≈130 px de largura) ampliada sem suavizar.
   ===================================================================== */
(() => {
  const cv = document.getElementById("jogo");
  const g = cv.getContext("2d");
  const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 130, H = 280, S = 3, PAN = 150;

  /* ---------- utilidades ---------- */
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const tela = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; return [c, x]; };
  const px = (c, x, y, cor, w = 1, h = 1) => { c.fillStyle = cor; c.fillRect(x | 0, y | 0, w, h); };
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- paleta ---------- */
  const P = {
    ceu: ["#2f5fd0", "#3a6fdc", "#4880e6", "#5891ee", "#6aa3f4", "#7fb5f8", "#97c7fb", "#b2d8fd", "#cde7ff"],
    nuvem: "#ffffff", nuvem2: "#e3eefc", nuvem3: "#bfd3f2",
    monteLonge: "#8fa2dc", monteLongeLuz: "#a9bbea", monteLongeSombra: "#7a8dcc", neve: "#f2f6ff",
    monte: "#5f8fc4", monteLuz: "#77a6d4", monteSombra: "#4f7cb2",
    colina: "#4f9e57", colinaLuz: "#69b85f", colinaSombra: "#3d8448", arvoreLonge: "#2f6e45", arvoreLongeLuz: "#4a8f4f",
    lago: "#4d8fe2", lagoFundo: "#3b73c9", brilho: "#c4e6ff",
    grama: "#69bf47", gramaLuz: "#8ed65a", gramaEscura: "#4fa03b", gramaMaisEscura: "#3c8834", borda: "#2b5e2a",
    tronco: "#7a4b2a", troncoLuz: "#9a6236", troncoSombra: "#55311c",
    folha: "#3f9a44", folhaLuz: "#5cb84f", folhaBrilho: "#86d36a", folhaSombra: "#2c7a37", folhaContorno: "#1d4f27",
    tinta: "#1b1430", navy: "#1b2a6b", navyFundo: "#0d1640",
    papel: "#fff6e0", lilas: "#b9a9e8", rosa: "#ef6f97",
    fita: "#d8344f", fitaLuz: "#f0607a", fitaSombra: "#9c1f3a",
    ouro: ["#fffbd6", "#fff1a0", "#ffd84a", "#f7b733", "#e8901f", "#c96d14"]
  };

  /* ---------- texto em pixel (fonte Silkscreen, sem anti-aliasing) ---------- */
  function mascaraTexto(txt, tam){
    const [c, x] = tela(1, 1);
    x.font = `${tam}px Silkscreen, monospace`;
    const w = Math.ceil(x.measureText(txt).width) + 2, h = Math.ceil(tam * 1.25) + 2;
    c.width = w; c.height = h;
    x.font = `${tam}px Silkscreen, monospace`; x.textBaseline = "top"; x.fillStyle = "#fff";
    x.fillText(txt, 1, 1);
    const d = x.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    let minY = h, maxY = 0, minX = w, maxX = 0;
    for (let i = 0; i < w * h; i++) if (d[i * 4 + 3] > 110){ m[i] = 1; const yy = (i / w) | 0, xx = i % w; minY = Math.min(minY, yy); maxY = Math.max(maxY, yy); minX = Math.min(minX, xx); maxX = Math.max(maxX, xx); }
    // recorta
    const ww = maxX - minX + 1, hh = maxY - minY + 1, r = new Uint8Array(ww * hh);
    for (let y = 0; y < hh; y++) for (let xx = 0; xx < ww; xx++) r[y * ww + xx] = m[(y + minY) * w + xx + minX];
    return { w: ww, h: hh, m: r };
  }
  // texto simples com contorno (para legendas)
  function textoContorno(txt, tam, cor, contorno){
    const t = mascaraTexto(txt, tam), [c, x] = tela(t.w + 2, t.h + 3);
    const em = (a, b) => a >= 0 && b >= 0 && a < t.w && b < t.h && t.m[b * t.w + a];
    for (let y = -1; y <= t.h + 1; y++) for (let xx = -1; xx <= t.w; xx++){
      if (em(xx, y)) continue;
      if (em(xx - 1, y) || em(xx + 1, y) || em(xx, y - 1) || em(xx, y + 1) || em(xx - 1, y - 1) || em(xx + 1, y - 1) || em(xx - 1, y + 1) || em(xx + 1, y + 1)) px(x, xx + 1, y + 1, contorno);
    }
    for (let y = 0; y < t.h; y++) for (let xx = 0; xx < t.w; xx++) if (em(xx, y)) px(x, xx + 1, y + 1, cor);
    return c;
  }

  /* ---------- LOGO ---------- */
  let logo = null; // { c, brilho:[pontos], w, h }
  function montarLogo(){
    // tamanho do "DA LIV": o maior que couber
    let t = null;
    for (const tam of [32, 24, 16]){ t = mascaraTexto("DA LIV", tam); if (t.w <= W - 34) break; }
    const pad = 3, lw = t.w + pad * 2, lh = t.h + pad * 2 + 3;
    const fita = mascaraTexto("ANIVERSARIO", 8), xAcento = mascaraTexto("ANIVERS", 8).w + 1;
    const fw = Math.max(fita.w + 22, 0), fh = fita.h + 8;
    const cw = Math.max(lw, fw + 8), ch = fh + lh + 2;
    const [c, x] = tela(cw, ch);
    const ox = ((cw - lw) / 2 | 0) + pad, oy = fh + 2 + pad;
    const em = (a, b) => a >= 0 && b >= 0 && a < t.w && b < t.h && t.m[b * t.w + a];
    const perto = (a, b, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) <= r + (r > 1 ? 1 : 0) && em(a + dx, b + dy)) return true; return false; };
    // sombra projetada
    for (let y = -pad; y < t.h + pad + 3; y++) for (let xx = -pad; xx < t.w + pad; xx++) if (perto(xx, y - 3, 2)) px(x, ox + xx, oy + y, P.navyFundo);
    // contorno grosso
    for (let y = -pad; y < t.h + pad; y++) for (let xx = -pad; xx < t.w + pad; xx++) if (perto(xx, y, 2)) px(x, ox + xx, oy + y, P.navy);
    // miolo dourado em faixas + chanfro
    const brilho = [];
    for (let y = 0; y < t.h; y++){
      const f = y / t.h, cor = f < .14 ? P.ouro[1] : f < .42 ? P.ouro[2] : f < .62 ? P.ouro[3] : f < .82 ? P.ouro[4] : P.ouro[5];
      for (let xx = 0; xx < t.w; xx++) if (em(xx, y)){
        let k = cor;
        if (!em(xx, y - 1)) k = P.ouro[0];                 // luz no topo de cada traço
        else if (!em(xx, y + 1)) k = P.ouro[5];            // sombra embaixo
        else if (!em(xx - 1, y) && f < .6) k = P.ouro[1];  // filete de luz à esquerda
        px(x, ox + xx, oy + y, k);
        brilho.push([ox + xx, oy + y]);
      }
    }
    // FITA vermelha com pontas dobradas
    const fx0 = (cw - fw) / 2 | 0, fy0 = 0;
    for (let y = 0; y < fh; y++){
      const borda = y === 0 || y === fh - 1;
      for (let xx = 4; xx < fw - 4; xx++) px(x, fx0 + xx, fy0 + y, borda ? P.tinta : y === 1 ? P.fitaLuz : y >= fh - 3 ? P.fitaSombra : P.fita);
      px(x, fx0 + 3, fy0 + y, P.tinta); px(x, fx0 + fw - 4, fy0 + y, P.tinta);
    }
    // pontas (cauda em "V")
    for (let y = 2; y < fh + 2; y++){
      const corte = Math.abs(y - (fh + 2) / 2) < 1.2 ? 2 : 0;
      for (let k = 0; k < 4 - corte; k++){ px(x, fx0 + k, fy0 + y, k === 0 ? P.tinta : P.fitaSombra); px(x, fx0 + fw - 1 - k, fy0 + y, k === 0 ? P.tinta : P.fitaSombra); }
    }
    // texto da fita
    const tx = fx0 + ((fw - fita.w) / 2 | 0), ty = fy0 + 4;
    for (let y = 0; y < fita.h; y++) for (let xx = 0; xx < fita.w; xx++) if (fita.m[y * fita.w + xx]){ px(x, tx + xx, ty + y + 1, P.fitaSombra); }
    for (let y = 0; y < fita.h; y++) for (let xx = 0; xx < fita.w; xx++) if (fita.m[y * fita.w + xx]) px(x, tx + xx, ty + y, P.papel);
    // acento agudo do "Á", desenhado à mão
    const ac = tx + xAcento + 2; px(x, ac, ty - 2, P.papel); px(x, ac + 1, ty - 3, P.papel); px(x, ac + 1, ty - 2, P.fitaSombra);
    logo = { c, w: cw, h: ch, brilho };
  }

  /* ---------- CENÁRIO (pré-desenhado) ---------- */
  let camadas = {};
  const horizonte = () => Math.round(H * .6);
  const chao = x => Math.round(H * .74 + Math.sin(x * .045 + 1.2) * 3 + Math.sin(x * .13) * 1);

  function montarCenario(){
    const r = rng(7);
    const hz = horizonte();

    // nuvens (3 modelos)
    camadas.nuvens = [34, 46, 26].map((w, i) => {
      const h = Math.round(w * .42), [c, x] = tela(w, h), rr = rng(20 + i);
      const bolhas = [];
      for (let k = 0; k < 6; k++){ const rad = h * (.35 + rr() * .3); bolhas.push([rad + rr() * (w - rad * 2), h - rad - rr() * h * .25, rad]); }
      for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++){
        let dentro = y >= h - 3 && xx > 3 && xx < w - 4;
        for (const [bx, by, br] of bolhas) if ((xx - bx) ** 2 + (y - by) ** 2 <= br * br) dentro = true;
        if (!dentro) continue;
        const f = y / h;
        px(x, xx, y, f > .82 ? P.nuvem3 : f > .62 ? ((xx + y) % 2 ? P.nuvem2 : P.nuvem3) : f > .5 ? P.nuvem2 : P.nuvem);
      }
      return c;
    });

    // montanhas distantes
    {
      const [c, x] = tela(W, H); const topo = [];
      const picos = [[W * .12, H * .44, 1.1], [W * .45, H * .40, .9], [W * .78, H * .43, 1.2], [W * 1.05, H * .47, 1]];
      for (let xx = 0; xx < W; xx++){ let y = hz; for (const [pxx, py, s] of picos) y = Math.min(y, py + Math.abs(xx - pxx) * s * (.85 + .3 * Math.sin(xx * .7))); topo[xx] = Math.round(y); }
      for (let xx = 0; xx < W; xx++){
        const sobe = xx > 0 && topo[xx] <= topo[xx - 1];
        for (let y = topo[xx]; y < hz + 2; y++){
          let cor = sobe ? P.monteLongeLuz : P.monteLongeSombra;
          if (y > topo[xx] + 10) cor = (xx + y) % 2 && y < topo[xx] + 12 ? cor : P.monteLonge;
          if (y - topo[xx] < 4 && topo[xx] < H * .47) cor = sobe ? P.neve : ((xx + y) % 2 ? P.neve : P.monteLongeSombra);
          px(x, xx, y, cor);
        }
      }
      camadas.montesLonge = c;
    }
    // montanhas mais perto
    {
      const [c, x] = tela(W, H); const topo = [];
      const picos = [[W * -.05, H * .5, .8], [W * .3, H * .52, .7], [W * .62, H * .49, .75], [W * .95, H * .53, .8]];
      for (let xx = 0; xx < W; xx++){ let y = hz + 4; for (const [pxx, py, s] of picos) y = Math.min(y, py + Math.abs(xx - pxx) * s); topo[xx] = Math.round(y + Math.sin(xx * .9) * .6); }
      for (let xx = 0; xx < W; xx++){
        const sobe = xx > 0 && topo[xx] <= topo[xx - 1];
        for (let y = topo[xx]; y < hz + 6; y++){
          let cor = y - topo[xx] < 6 ? (sobe ? P.monteLuz : P.monteSombra) : P.monte;
          if (y - topo[xx] === 6 && (xx + y) % 2) cor = sobe ? P.monteLuz : P.monteSombra;
          px(x, xx, y, cor);
        }
      }
      camadas.montes = c;
    }
    // colinas com arvorezinhas + lago
    {
      const [c, x] = tela(W, H);
      const lagoTopo = hz + 6;
      // lago
      for (let y = lagoTopo; y < H; y++) for (let xx = 0; xx < W; xx++) px(x, xx, y, y < lagoTopo + 2 ? P.lagoFundo : P.lago);
      // colinas (duas ondas)
      const onda = (base, amp, fr, fase, cor, luz, sombra) => {
        for (let xx = 0; xx < W; xx++){
          const t = Math.round(base + Math.sin(xx * fr + fase) * amp + Math.sin(xx * fr * 2.7 + fase) * amp * .35);
          for (let y = t; y < base + amp + 3; y++){
            let k = cor;
            if (y === t) k = luz; else if (y === t + 1 && (xx % 2)) k = luz;
            if (y > base + amp) k = sombra;
            px(x, xx, y, k);
          }
          if (r() < .22){ // arvorezinha
            const ax = xx, ay = t - 1;
            px(x, ax - 1, ay - 3, P.arvoreLonge, 3, 3); px(x, ax, ay - 4, P.arvoreLonge); px(x, ax - 1, ay - 3, P.arvoreLongeLuz);
            px(x, ax, ay, P.troncoSombra);
          }
        }
      };
      onda(hz - 2, 3, .07, 0, P.colina, P.colinaLuz, P.colinaSombra);
      onda(hz + 2, 2, .11, 2, P.colinaSombra, P.colina, P.colinaSombra);
      camadas.colinas = c; camadas.lagoTopo = hz + 6;
    }
    // chão da frente (grama) com flores e textura
    {
      const AH = Math.ceil(H * 1.5);
      const [c, x] = tela(W, AH);
      for (let xx = 0; xx < W; xx++){
        const t = chao(xx);
        for (let y = t; y < AH; y++){
          let k = P.grama;
          const d = y - t;
          if (d === 0) k = P.borda; else if (d === 1) k = P.gramaLuz; else if (d === 2 && xx % 2) k = P.gramaLuz;
          else if (d > 20 && (xx * 7 + y * 3) % 11 === 0) k = P.gramaEscura;
          px(x, xx, y, k);
        }
      }
      // tufos e listras de grama
      for (let i = 0; i < W * 3.4; i++){
        const xx = (r() * W) | 0, y = chao(xx) + 5 + ((r() * (H * 1.45 - chao(xx))) | 0);
        px(x, xx, y, P.gramaEscura); px(x, xx, y - 1, P.gramaEscura); if (r() < .5) px(x, xx + 1, y, P.gramaMaisEscura);
        if (r() < .3) px(x, xx - 1, y - 2, P.gramaLuz);
      }
      // flores
      const cores = [[P.rosa, "#ffd34d"], ["#ffffff", "#ffd34d"], ["#f7a8c0", "#ffffff"]];
      for (let i = 0; i < 46; i++){
        const xx = 3 + (r() * (W - 6)) | 0, y = chao(xx) + 6 + ((r() * (H * .62)) | 0), [p, m] = cores[(r() * 3) | 0];
        px(x, xx, y - 1, p); px(x, xx - 1, y, p); px(x, xx + 1, y, p); px(x, xx, y + 1, p); px(x, xx, y, m);
        px(x, xx, y + 2, P.gramaMaisEscura);
      }
      camadas.chao = c;
    }
    // árvore grande
    {
      const tw = 64, th = 96, [c, x] = tela(tw, th);
      const base = th - 2, cx = 30;
      // tronco
      for (let y = 46; y <= base; y++){
        const larg = 5 + Math.round((y - 46) / 50 * 4) + (y > base - 4 ? (y - (base - 4)) * 2 : 0);
        for (let k = -larg; k <= larg; k++){
          let cor = k < -larg + 2 ? P.troncoSombra : k > larg - 3 ? P.troncoLuz : P.tronco;
          if (Math.abs(k) === larg) cor = P.tinta;
          if ((y * 3 + k * 5) % 13 === 0 && Math.abs(k) < larg - 1) cor = P.troncoSombra;
          px(x, cx + k, y, cor);
        }
      }
      px(x, cx - 12, base, P.tinta, 24, 1);
      // copa
      const bolas = [[30, 30, 22], [14, 38, 13], [47, 38, 14], [22, 18, 13], [40, 17, 13], [31, 9, 10], [30, 44, 12]];
      const dentro = (a, b) => bolas.some(([bx, by, br]) => (a - bx) ** 2 + (b - by) ** 2 <= br * br);
      const rr = rng(3);
      for (let y = 0; y < 60; y++) for (let xx = 0; xx < tw; xx++){
        if (!dentro(xx, y)) continue;
        if (!dentro(xx - 1, y) || !dentro(xx + 1, y) || !dentro(xx, y - 1) || !dentro(xx, y + 1)){ px(x, xx, y, P.folhaContorno); continue; }
        // luz vindo de cima-direita, por bola mais próxima
        let best = null, bd = 1e9; for (const b of bolas){ const d = ((xx - b[0]) ** 2 + (y - b[1]) ** 2) / (b[2] * b[2]); if (d < bd){ bd = d; best = b; } }
        const n = ((xx - best[0]) * .6 + (y - best[1]) * -.8) / best[2];
        const dither = (xx + y) % 2;
        let k = n > .55 ? P.folhaBrilho : n > .25 ? (dither ? P.folhaBrilho : P.folhaLuz) : n > -.05 ? P.folhaLuz : n > -.35 ? (dither ? P.folhaLuz : P.folha) : n > -.6 ? P.folha : (dither ? P.folha : P.folhaSombra);
        if (bd > .78 && n < 0) k = P.folhaSombra;
        if (rr() < .05) k = P.folhaSombra;
        px(x, xx, y, k);
      }
      camadas.arvore = c; camadas.arvoreBase = base; camadas.arvoreCx = cx;
    }
  }

  /* ---------- LIV (sprite original, de costas) ---------- */
  const SPRITE = [
    "....oooo....",
    "...oHHHHo...",
    "..oHhhHHHo..",
    "..oHhHHHHo..",
    ".oHHhHHHHHo.",
    ".oHHHHHHHHo.",
    ".oHHHHHHHHo.",
    "ogTHHHHHHTgo",
    "otTHHHHHHTto",
    "otTdHHHHdTto",
    "ostdHHHHdtso",
    "ostTdHHdTtso",
    ".ottTddTtto.",
    ".oppppppppo.",
    ".opppPPpppo.",
    "..oppo.oppo.",
    "..oPpo.opPo.",
    "..oPpo.opPo.",
    "..okko.okko.",
    "..oooo.oooo."
  ];
  const FRENTE = [
    "....oooooooo....",
    "...oHHHHHHHHo...",
    "..oHHhhhHHHHHo..",
    ".oHHhhHHHHHHHHo.",
    ".oHHHHHHHHHHHHo.",
    ".oHHHHHHHHHHHHo.",
    ".oHHHsHHHHsHHHo.",
    ".oHHssssssssHHo.",
    ".oHHsllssllsHHo.",
    ".oHHsewssewsHHo.",
    ".oHHbeesseebHHo.",
    ".oHHssssSsssHHo.",
    ".oHHsssmMsssHHo.",
    ".oHHHssssssHHHo.",
    "oHHHHttssttHHHHo",
    "oHHttcsssscttHHo",
    "oHgttTcsscTttgHo",
    "oHgtttTccTtttgHo",
    "oHsttttttttxtsHo",
    "oHstTttttttTtsHo",
    ".oHsttttttttsHo.",
    "..osppppppppso..",
    "...opppPPpppo...",
    "...opppoopppo...",
    "...oppPooPppo...",
    "...oppPooPppo...",
    "...okkkookkko...",
    "...oooooooooo..."
  ];
  const CORES_LIV = { o: "#1b1430", H: "#241918", h: "#463230", d: "#120c0c", s: "#f6d5bf", S: "#e2b293", t: "#f7f5f0", T: "#d8d4cc", c: "#8a1c2b", g: "#1d6b48", x: "#8a1c2b", p: "#34477a", P: "#26355e", k: "#221c38", e: "#3a2820", w: "#ffffff", l: "#1b1430", b: "#f2a5a5", m: "#c9505e", M: "#b03c4b" };
  function desenhaLivFrente(x0, y0, t, E = 2){
    const pp = (x, y, cor, w = 1, h = 1) => px(g, x0 + x * E, y0 + y * E, cor, w * E, h * E);
    const piscando = (t % 3600) < 150;
    const falando = window.livFala && Math.floor(t / 110) % 2 === 0;
    FRENTE.forEach((linha, y) => [...linha].forEach((ch, xx) => {
      let k = ch;
      if (piscando && (ch === "e" || ch === "w")) k = y === 10 ? "l" : "s";
      let cor = CORES_LIV[k];
      if (falando && (ch === "M" || ch === "m")) cor = "#6e1f2a";
      if (cor) pp(xx, y, cor);
    }));
    // mechas balançando
    const f = ((Math.floor(t / 320) % 2) + 2) % 2;
    pp(f, 19, CORES_LIV.H); pp(15 - f, 19, CORES_LIV.H);
  }
  function balao(x, y, tipo, t){
    // balãozinho 9x9 com rabinho
    const B = ["..ooooo..",".oWWWWWo.","oWWWWWWWo","oWWWWWWWo","oWWWWWWWo","oWWWWWWWo",".oWWWWWo.","..ooWoo..","....o...."];
    B.forEach((l, yy) => [...l].forEach((c, xx) => { if (c === "o") px(g, x + xx, y + yy, P.tinta); if (c === "W") px(g, x + xx, y + yy, "#ffffff"); }));
    if (tipo === "!"){ px(g, x + 4, y + 2, P.rosa, 1, 3); px(g, x + 4, y + 6, P.rosa); }
    else { const pulsa = Math.floor(t / 250) % 2; const C = ["oo.oo", "ooooo", ".ooo.", "..o.."];
      C.forEach((l, yy) => [...l].forEach((c, xx) => { if (c === "o") px(g, x + 2 + xx, y + 2 + yy - pulsa * 0, P.rosa); })); if (pulsa) px(g, x + 3, y + 2, "#ffc2d4"); }
  }
  function desenhaLiv(x0, y0, t){
    SPRITE.forEach((linha, y) => [...linha].forEach((ch, xx) => { if (CORES_LIV[ch]) px(g, x0 + xx, y0 + y, CORES_LIV[ch]); }));
    // cabelo ao vento
    const f = ((Math.floor(t / 260) % 3) + 3) % 3;
    const mechas = [[[-1, 6], [-1, 7], [-2, 8]], [[-1, 6], [-2, 7], [-2, 8], [-3, 9]], [[-1, 7], [-2, 8], [-3, 8]]][f];
    mechas.forEach(([dx, dy]) => px(g, x0 + 1 + dx, y0 + dy, CORES_LIV.H));
    mechas.forEach(([dx, dy]) => px(g, x0 + dx, y0 + dy, CORES_LIV.o));
  }

  /* ---------- PET: filhotinho de cachorro (original) ---------- */
  const PET = [
    ".oo......oo.",
    "oDDooooooDDo",
    "oDDBBBBBBDDo",
    "oDoBBBBBBoDo",
    ".oBBeBBeBBo.",
    ".oBpLLLLpBo.",
    "..oLLnnLLo..",
    "..obLLLLbo..",
    ".obBBBBBBbo.",
    ".oLoBBBBoLo.",
    "..o.oooo.o.."
  ];
  const CORES_PET = { o: "#2a170d", B: "#9a6436", b: "#7d4e2a", D: "#5c361d", L: "#d9a874", e: "#120a06", n: "#120a06", p: "#d98a7a" };
  function desenhaPet(x0, y0, t, E = 1){
    const pisca = (t % 4100) < 140;
    const orelha = (t % 2600) < 260;
    PET.forEach((linha, y) => [...linha].forEach((ch, xx) => {
      let k = ch;
      if (pisca && ch === "e") k = "b";
      let yy = y;
      if (orelha && y <= 3 && xx >= 9) yy = y - 1;
      if (CORES_PET[k]) px(g, x0 + xx * E, y0 + yy * E, CORES_PET[k], E, E);
    }));
  }
  function bolhas(x, y, t){
    for (let i = 0; i < 3; i++){
      const f = ((t / 1400 + i / 3) % 1), bx = Math.round(x + Math.sin(f * 6 + i) * 2 + i * 3), by = Math.round(y - f * 18);
      if (f < .9){ px(g, bx, by, "#e3f6ff"); px(g, bx + 1, by, "#a8dcf5"); px(g, bx, by - 1, "#a8dcf5"); }
    }
  }

  /* ---------- estado ---------- */
  let inicio = 0, fase = "preto", tLogo = 0, menuVisivel = false, sel = 0, flashAte = 0;
  let camDe = 0, camPara = 0, camT0 = 0, tCena = 0, festaAte = 0;
  const nuvens = [], passaros = [], folhas = [];
  let api = null; // { itens: () => [[rotulo, fn], ...], bip, jingle }

  function preparar(){
    const r = document.getElementById("tela").getBoundingClientRect();
    S = Math.max(2, Math.round(r.width / 132));
    W = Math.ceil(r.width / S); H = Math.ceil(r.height / S);
    cv.width = W; cv.height = H; g.imageSmoothingEnabled = false;
    PAN = Math.round(H * .58);
    montarCenario(); montarLogo();
    nuvens.length = 0; const rr = rng(11);
    for (let i = 0; i < 7; i++) nuvens.push({ m: i % 3, x: rr() * (W + 40) - 20, y: H * (.04 + i * .065) + rr() * 8 - PAN * .25, v: .004 + rr() * .006 });
    passaros.length = 0;
    for (let i = 0; i < 3; i++) passaros.push({ x: -10 - i * 9, y: H * .3 + i * 5, v: .012 + i * .002, f: i });
  }

  /* ---------- desenho de cada quadro ---------- */
  function quadro(agora){
    const t = Math.max(0, agora - inicio);
    let cam = PAN;           // 0 = olhando o céu, PAN = final
    if (fase === "preto" || fase === "apresenta") cam = 0;
    else if (fase === "pan") cam = PAN * ease(cl((t - 2600) / 3400, 0, 1));
    else if (fase === "cena") cam = camDe + (camPara - camDe) * ease(cl((agora - camT0) / 1100, 0, 1));
    const off = p => Math.round((PAN - cam) * p);

    // CÉU em faixas com pontilhado
    const ceuTopo = -PAN * .2 + off(.2), ceuFim = horizonte() + off(.45);
    const n = P.ceu.length, banda = (ceuFim - ceuTopo) / n;
    px(g, 0, 0, P.ceu[0], W, H);
    for (let i = 0; i < n; i++){
      const y0 = Math.round(ceuTopo + i * banda);
      px(g, 0, y0, P.ceu[i], W, Math.ceil(banda) + 1);
      if (i > 0) for (let xx = (i % 2); xx < W; xx += 2) px(g, xx, y0 - 1, P.ceu[i]);
      if (i > 0) for (let xx = ((i + 1) % 2); xx < W; xx += 4) px(g, xx, y0 - 2, P.ceu[i]);
    }
    px(g, 0, Math.round(ceuFim), P.ceu[n - 1], W, H);

    // sol com halo
    const sx = Math.round(W * .8), sy = Math.round(H * .14) + off(.18);
    for (let rr = 13; rr >= 7; rr -= 3) { g.fillStyle = rr > 10 ? "rgba(255,255,255,.18)" : "rgba(255,255,230,.3)"; for (let y = -rr; y <= rr; y++){ const w = Math.round(Math.sqrt(rr * rr - y * y)); g.fillRect(sx - w, sy + y, w * 2, 1); } }
    for (let y = -5; y <= 5; y++){ const w = Math.round(Math.sqrt(30 - y * y)); px(g, sx - w, sy + y, y < -2 ? "#ffffff" : "#fff6c2", w * 2, 1); }

    // nuvens
    nuvens.forEach(nv => {
      if (!reduz) nv.x += nv.v * 16; if (nv.x > W + 10) nv.x = -camadas.nuvens[nv.m].width - 6;
      g.drawImage(camadas.nuvens[nv.m], Math.round(nv.x), Math.round(nv.y + off(.25) + PAN * .25 * 0));
    });

    // pássaros
    passaros.forEach(b => {
      if (!reduz) b.x += b.v * 16; if (b.x > W + 8) b.x = -8;
      const asa = Math.floor((t / 180 + b.f) % 2);
      const bx = Math.round(b.x), by = Math.round(b.y + off(.3) + Math.sin(t / 500 + b.f) * 1.5);
      px(g, bx, by, P.tinta); px(g, bx - 1, by - asa, P.tinta); px(g, bx + 1, by - asa, P.tinta); px(g, bx - 2, by - 1 + asa, P.tinta); px(g, bx + 2, by - 1 + asa, P.tinta);
    });

    g.drawImage(camadas.montesLonge, 0, off(.45));
    g.drawImage(camadas.montes, 0, off(.55));
    g.drawImage(camadas.colinas, 0, off(.7));
    // brilho no lago
    const lt = camadas.lagoTopo + off(.7);
    for (let i = 0; i < 9; i++){
      const yy = lt + 4 + (i * 5) % 18, xx = Math.round((i * 37 + t / (60 + i * 9)) % (W + 10)) - 5;
      if (Math.sin(t / 300 + i) > -.3) px(g, xx, yy, P.brilho, 3 + (i % 3), 1);
    }

    // chão + grama balançando
    const oc = off(1);
    g.drawImage(camadas.chao, 0, oc);
    for (let xx = 1; xx < W; xx += 3){
      const top = chao(xx) + oc, sw = Math.round(Math.sin(t / 420 + xx * .35) * 1.1);
      px(g, xx + sw, top - 2, P.gramaLuz); px(g, xx, top - 1, P.gramaLuz);
      if (xx % 2) { px(g, xx + 1 + sw, top - 3, P.gramaEscura); }
    }
    // árvore
    const ax = Math.round(W * .16) - camadas.arvoreCx, ay = chao(Math.round(W * .16)) - camadas.arvoreBase + 2 + oc;
    g.drawImage(camadas.arvore, ax, ay);
    // Liv
    const lx = Math.round(W * .6), ly = chao(lx + 6) - SPRITE.length + 1 + oc;
    px(g, lx + 1, ly + SPRITE.length - 1, "rgba(27,20,48,.35)", 10, 1);
    if (fase === "cena" && agora - camT0 > 700){
      const dt = agora - camT0 - 700;
      let pulo = 0;
      if (agora < festaAte) pulo = Math.round(Math.abs(Math.sin((festaAte - agora) / 160)) * 4);
      else if (dt < 300) pulo = Math.round(Math.sin(dt / 300 * Math.PI) * 3);
      const resp = Math.floor(agora / 650) % 2;
      const fx = Math.round(W / 2) - 30, fy = ly + SPRITE.length - FRENTE.length * 2 + 2 - pulo;
      px(g, fx + 6, ly + SPRITE.length + 1, "rgba(27,20,48,.35)", 20, 1);
      desenhaLivFrente(fx, fy, agora);
      const salto = agora < festaAte ? Math.round(Math.abs(Math.sin((festaAte - agora) / 130)) * 3) : 0;
      const pxx = fx + 38, chaoPet = chao(pxx + 12) + oc;
      const pyy = chaoPet - PET.length * 2 + 3 - salto;
      px(g, pxx + 3, chaoPet + 2, "rgba(27,20,48,.3)", 18, 1);
      desenhaPet(pxx, pyy, agora + 900, 2);
      if (dt < 1400) balao(fx - 8, fy - 4, "!", agora);
      else if (agora < festaAte || (agora % 5200) < 1800) balao(fx - 8, fy - 4, "coracao", agora);
    } else {
      desenhaLiv(lx, ly, t);
      desenhaPet(lx + 14, chao(lx + 20) + oc - PET.length + 1, t);
    }
    // folhas caindo
    if (!reduz && fase !== "preto" && fase !== "apresenta" && folhas.length < 6 && Math.random() < .02) folhas.push({ x: ax + 10 + Math.random() * 40, y: ay + 10, v: .25 + Math.random() * .2, f: Math.random() * 6 });
    for (let i = folhas.length - 1; i >= 0; i--){
      const fl = folhas[i]; fl.y += fl.v; fl.x += Math.sin((fl.y + fl.f * 10) / 9) * .4 + .15;
      px(g, fl.x, fl.y, (Math.floor(fl.y / 4) % 2) ? P.folhaBrilho : P.folhaLuz, 2, 1);
      if (fl.y > H + 2) folhas.splice(i, 1);
    }

    // LOGO
    if (fase === "titulo" || fase === "menu" || (fase === "cena" && cam < camPara - 2)){
      const lt0 = (agora - tLogo) / 700;
      const bounce = lt0 < 1 ? (1 - Math.pow(1 - lt0, 3)) : 1;
      const lyFinal = Math.round(H * .13);
      const lyy = Math.round(-logo.h + (lyFinal + logo.h) * bounce + (lt0 < 1 ? 0 : Math.round(Math.sin((agora - tLogo) / 900) * 1))) + (fase === "cena" ? Math.round((PAN - cam) * 1.2) : 0);
      const lxx = Math.round((W - logo.w) / 2);
      g.drawImage(logo.c, lxx, lyy);
      // brilho que atravessa as letras
      const ciclo = ((agora - tLogo - 900) % 3200) / 3200;
      if (agora - tLogo > 900 && ciclo < .45){
        const pos = ciclo / .45 * (logo.w + 40) - 20;
        g.fillStyle = "#ffffff";
        for (const [bx, by] of logo.brilho){ const d = bx + by * .6 - pos; if (d >= 0 && d < 3) g.fillRect(lxx + bx, lyy + by, 1, 1); }
      }
      // brilhinho estrela no canto do logo
      const sp = Math.floor((agora - tLogo) / 120) % 14;
      if (lt0 >= 1 && sp < 4){ const s = [1, 2, 3, 2][sp], bx = lxx + logo.w - 6, by = lyy + logo.h - 10; px(g, bx - s, by, "#fff", s * 2 + 1, 1); px(g, bx, by - s, "#fff", 1, s * 2 + 1); }
    }

    // textos finais
    if (fase === "titulo" && agora - tLogo > 900){
      if (Math.floor((agora - tLogo) / 520) % 2 === 0){
        const tx = camadas.toque; g.drawImage(tx, Math.round((W - tx.width) / 2), Math.round(H * .86));
      }
      const cp = camadas.copy; g.drawImage(cp, Math.round((W - cp.width) / 2), H - cp.height - 3);
    }
    if (fase === "menu") desenhaMenu(agora);

    // "LIV APRESENTA"
    if (fase === "preto" || fase === "apresenta"){
      px(g, 0, 0, "#000", W, H);
      if (fase === "apresenta"){
        const a = t - 400, ap = camadas.apresenta;
        const vis = a < 300 ? Math.floor(a / 75) / 4 : a > 1700 ? 1 - Math.floor((a - 1700) / 75) / 4 : 1;
        g.globalAlpha = cl(vis, 0, 1);
        const axx = Math.round((W - ap.width) / 2), ayy = Math.round(H * .48);
        g.drawImage(ap, axx, ayy);
        // estrela cadente atravessando
        const sxp = (a - 200) / 1200 * (W + 30) - 15;
        if (sxp > -15 && sxp < W + 15){ for (let k = 0; k < 10; k++) px(g, sxp - k, ayy - 6 + k * .35, k < 2 ? "#fff" : k < 5 ? "#fff1a0" : "#b9a9e8"); }
        g.globalAlpha = 1;
      }
    }
    // clarão
    if (agora < flashAte){ g.globalAlpha = cl((flashAte - agora) / 450, 0, 1); px(g, 0, 0, "#fff", W, H); g.globalAlpha = 1; }
  }

  /* ---------- menu na tela ---------- */
  let menuRects = [];
  function desenhaMenu(agora){
    const itens = api.itens(), lh = 13, mw = W - 26, mh = itens.length * lh + 8;
    const mx = 13, my = Math.round(H * .80) - (itens.length > 1 ? 6 : 0);
    // janela: contorno escuro com cantos cortados, papel, filete lilás
    px(g, mx + 1, my, P.tinta, mw - 2, 1); px(g, mx + 1, my + mh - 1, P.tinta, mw - 2, 1);
    px(g, mx, my + 1, P.tinta, 1, mh - 2); px(g, mx + mw - 1, my + 1, P.tinta, 1, mh - 2);
    px(g, mx + 1, my + 1, P.papel, mw - 2, mh - 2);
    px(g, mx + 2, my + 2, P.lilas, mw - 4, 1); px(g, mx + 2, my + mh - 3, P.lilas, mw - 4, 1);
    px(g, mx + 2, my + 2, P.lilas, 1, mh - 4); px(g, mx + mw - 3, my + 2, P.lilas, 1, mh - 4);
    px(g, mx + 1, my + mh, "rgba(13,22,64,.45)", mw - 1, 1); px(g, mx + mw, my + 2, "rgba(13,22,64,.45)", 1, mh - 2);
    menuRects = [];
    itens.forEach(([rotulo], i) => {
      const iy = my + 7 + i * lh, img = camadas.menuTxt[i];
      g.drawImage(img, mx + 16, iy);
      menuRects.push([mx, iy - 3, mw, lh]);
      if (i === sel){
        const pulo = Math.floor(agora / 260) % 2;
        for (let k = 0; k < 4; k++) px(g, mx + 7 + pulo + k, iy + k, P.tinta, 1, 7 - k * 2);
      }
    });
  }
  function montarTextosMenu(){
    camadas.menuTxt = api.itens().map(([rot]) => { const t = mascaraTexto(rot, 8), [c, x] = tela(t.w, t.h); for (let y = 0; y < t.h; y++) for (let xx = 0; xx < t.w; xx++) if (t.m[y * t.w + xx]) px(x, xx, y, P.tinta); return c; });
  }

  /* ---------- controle ---------- */
  function avancar(){
    const agora = performance.now();
    if (fase === "preto" || fase === "apresenta" || fase === "pan"){ irTitulo(agora); return; }
    if (fase === "titulo"){ api.bip(1320, .07); montarTextosMenu(); sel = 0; fase = "menu"; return; }
    if (fase === "menu"){ escolher(sel); }
  }
  function irTitulo(agora){
    fase = "titulo"; tLogo = agora; flashAte = agora + 450;
    api.jingle([[523, 0], [659, 90], [784, 180], [1047, 270, .3], [988, 600, .1], [1047, 700, .4]]);
  }
  function escolher(i){
    const it = api.itens()[i]; if (!it) return;
    api.bip(1320, .07); flashAte = performance.now() + 450; it[1]();
  }
  cv.addEventListener("pointerdown", e => {
    if (!document.getElementById("titulo").classList.contains("ativa")) return;
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    if (fase === "menu"){
      const i = menuRects.findIndex(([a, b, w, h]) => x >= a && x <= a + w && y >= b && y <= b + h);
      if (i >= 0){ sel = i; escolher(i); }
      return;
    }
    avancar();
  });
  document.addEventListener("keydown", e => {
    if (!document.getElementById("titulo").classList.contains("ativa")) return;
    if (fase === "menu" && (e.key === "ArrowDown" || e.key === "ArrowUp")){ e.preventDefault(); const n = api.itens().length; sel = (sel + (e.key === "ArrowDown" ? 1 : n - 1)) % n; api.bip(880, .03); }
    if (e.key === "Enter" || e.key === " "){ e.preventDefault(); avancar(); }
  });

  /* ---------- laço ---------- */
  function loop(agora){
    {
      const t = agora - inicio;
      if (fase === "preto" && t > 400) fase = "apresenta";
      if (fase === "apresenta" && t > 2500){ fase = "pan"; flashAte = agora + 300; }
      if (fase === "pan" && t > 6100) irTitulo(agora);
      quadro(agora);
    }
    requestAnimationFrame(loop);
  }

  window.iniciarTitulo = async (opcoes) => {
    api = opcoes;
    try { await Promise.race([Promise.all([document.fonts.load("8px Silkscreen"), document.fonts.load("bold 8px Silkscreen")]), new Promise(r => setTimeout(r, 1500))]); } catch(e){}
    preparar();
    camadas.toque = textoContorno("TOQUE PARA COMEÇAR", 8, P.papel, P.navyFundo);
    camadas.copy = textoContorno("© 2026 LIV", 8, "#d9e2ff", P.navyFundo);
    camadas.apresenta = textoContorno("LIV APRESENTA", 8, "#ffffff", "#000000");
    inicio = performance.now();
    if (reduz){ fase = "titulo"; tLogo = inicio - 2000; }
    addEventListener("resize", () => { preparar(); if (fase === "menu") montarTextosMenu(); });
    requestAnimationFrame(loop);
  };
  window.tituloCena = () => {
    if (fase === "cena") return;
    const agora = performance.now();
    if (fase !== "titulo" && fase !== "menu") { tLogo = agora - 2000; }
    camDe = PAN; camPara = PAN + Math.round(H * .3); camT0 = agora; fase = "cena";
  };
  window.tituloFesta = () => { festaAte = performance.now() + 2200; };
  window.voltarMenuTitulo = () => { if (fase === "menu") montarTextosMenu(); };
})();
