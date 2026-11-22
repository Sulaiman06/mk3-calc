(function(){
  const $ = id => document.getElementById(id);

  // custom dropdowns (Payload, Rotation) -> keep their hidden native <select> in sync
  function setupDropdown(selectId, dropdownId, btnId, listId){
    const sel = $(selectId);
    const container = $(dropdownId);
    const btn = $(btnId);
    const arrow = document.createElement('span');
    const list = $(listId);
    const opts = list.querySelectorAll('.dropdown-option');
    const label = btn.textContent; // initial label text (before arrow span)
    const arrowSpan = btn.querySelector('.dropdown-arrow');

    function setLabel(text){
      btn.textContent = text;
      btn.appendChild(arrowSpan);
    }
    function close(){ list.hidden = true; container.classList.remove('open'); }
    function open(){ list.hidden = false; container.classList.add('open'); }

    btn.addEventListener('click', () => { list.hidden ? open() : close(); });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#'+dropdownId)) close();
    });
    opts.forEach(opt => {
      opt.addEventListener('click', () => {
        sel.value = opt.dataset.value;
        setLabel(opt.textContent);
        opts.forEach(o => o.classList.toggle('selected', o === opt));
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        close();
      });
    });
  }
  setupDropdown('payload', 'payload_dropdown', 'payload_dropdown_btn', 'payload_dropdown_list');
  setupDropdown('rot', 'rot_dropdown', 'rot_dropdown_btn', 'rot_dropdown_list');

  const inputs = ['ox','oy','oz','tx','ty','tz','fy','payload','rot'].map(id => $(id));

  // clicking/tabbing into a number field arms it; the moment you type a new
  // character (including a leading "-") the old value is wiped
  ['ox','oy','oz','tx','ty','tz','fy'].forEach(id => {
    const el = $(id);
    let fresh = false;
    el.addEventListener('focus', () => { fresh = true; });
    el.addEventListener('blur', () => { fresh = false; });
    el.addEventListener('beforeinput', e => {
      if(!fresh) return;
      fresh = false;
      if(e.data !== null && e.data !== undefined && e.data !== ''){
        el.value = '';
      }
    });
  });

  // remember the Final Y / Nuke Size value separately per payload type
  const fyMemory = { stab: $('fy').value, nuke: $('fy').value };
  let lastPayload = $('payload').value;

  $('payload').addEventListener('input', () => {
    fyMemory[lastPayload] = $('fy').value;
    const next = $('payload').value;
    $('fy').value = fyMemory[next];
    lastPayload = next;
  });

  $('fy').addEventListener('input', () => {
    fyMemory[$('payload').value] = $('fy').value;
  });

  function num(id){
    const v = parseFloat($(id).value);
    return isNaN(v) ? 0 : v;
  }

  function round(x){
    // match Excel ROUND(x,0) — round half away from zero
    return x >= 0 ? Math.floor(x + 0.5) : Math.ceil(x - 0.5);
  }

  function recalc(){
    const B8  = parseInt($('rot').value, 10); // Rotation: 0 / 90 / 180 / 270
    const B5 = num('ox'),  B6 = num('oy'),  B7 = num('oz');
    const B11 = num('tx'), B12 = num('ty'), B13 = num('tz');
    const B14 = num('fy');
    const payload = $('payload').value;
    const isNuke = payload === 'nuke';

    $('finalYLabel').textContent = isNuke ? 'Nuke Size' : 'Final Y';

    const dX = Math.abs(B11-B5);
    const dZ = Math.abs(B13-B7);
    const constXZ = 2.62106391490762;
    const constZ  = 2.62466021524172;

    // Z Accel — each heading has its own constant offset
    let B22;
    if(B8 === 90)       B22 = round((dX/constZ)/0.9) - 7;
    else if(B8 === 180) B22 = round((dZ/constZ)/0.9) - 5;
    else if(B8 === 270) B22 = round((dX/constZ)/0.9) - 5;
    else /* 0 */         B22 = round((dZ/constZ)/0.9) - 5;
    const C22 = Math.trunc(B22/64);
    const D22 = (B22/64 - C22)*64;

    // Y Accel — which delta is "primary" vs "cross term" flips at 90°
    let B20;
    if(B8 === 90){
      B20 = round(
        (Math.abs(B12-B6+124)/1.5436468807107)/1.5
        - (((dZ/constXZ) - ((B22*0.0262465520910017)/constXZ)) * 0.0291949662627057) / 1.5436468807107
        - ((dX/constZ) * 0.0295273742311964) / 1.5436468807107
      );
    } else {
      B20 = round(
        (Math.abs(B12-B6+124)/1.5436468807107)/1.5
        - (((dX/constXZ) - ((B22*0.0262465520910017)/constXZ)) * 0.0291949662627057) / 1.5436468807107
        - ((dZ/constZ) * 0.0295273742311964) / 1.5436468807107
      );
    }
    const C20 = Math.trunc(B20/64);
    const D20 = (B20/64 - C20)*64;

    // X Accel — each heading has its own constant offset
    let B21;
    if(B8 === 90){
      B21 = round((dZ/constXZ)/0.9 + 10 - (B22*0.0262465520909831)/constXZ - (B20*1.55713695987425)/constXZ);
    } else if(B8 === 180){
      B21 = round((dX/constXZ)/0.9 + 13 - (B22*0.0262465520909831)/constXZ - (B20*1.55713695987425)/constXZ);
    } else if(B8 === 270){
      B21 = round((dZ/constXZ)/0.9 + 13 - (B22*0.0262465520909831)/constXZ - (B20*1.55713695987425)/constXZ);
    } else /* 0 */ {
      B21 = round((dX/constXZ)/0.9 + 8 - (B22*0.0262465520909831)/constXZ - (B20*1.55713695987425)/constXZ);
    }
    const C21 = Math.trunc(B21/64);
    const D21 = (B21/64 - C21)*64;

    // Payload
    const B18 = isNuke ? B14 : round(Math.abs(B12-B14)/3);
    const C18 = Math.trunc(B18/64);
    const D18 = round((B18/64 - C18)*64);

    // Propellant / Swing Kill
    const B19 = isNuke ? 3 : round(((Math.abs(B12-B14)/0.248)/3));
    const C19 = Math.trunc(B19/64);
    const D19 = round((B19/64 - C19)*64);

    // Wait time
    const B25 = isNuke
      ? 6*(B19+B21+B22+B20+40) + (B18*36*6)
      : 6*(B19+B18+B21+B22+B20+40);
    const B26 = Math.ceil(B25/1200);

    // Warning
    const outOfRange = (B21 > 1728 || B22 > 1728);
    const nukeTooBig = (isNuke && B14 > 32);
    const invalidInputs = (B18 < 0 || B19 < 0 || B20 < 0 || B21 < 0 || B22 < 0);

    // --- write to DOM ---
    $('payload_count').textContent = B18;
    $('payload_stack').textContent = C18;
    $('payload_extra').textContent = D18;

    $('prop_count').textContent = B19;
    $('prop_stack').textContent = C19;
    $('prop_extra').textContent = D19;

    $('yaccel_count').textContent = B20;
    $('yaccel_stack').textContent = C20;
    $('yaccel_extra').textContent = D20;

    $('xaccel_count').textContent = B21;
    $('xaccel_stack').textContent = C21;
    $('xaccel_extra').textContent = D21;

    $('zaccel_count').textContent = B22;
    $('zaccel_stack').textContent = C22;
    $('zaccel_extra').textContent = D22;

    $('ticks').textContent = B25;
    $('minutes').textContent = B26;

    const box = $('warningBox');
    const txt = $('warningText');
    const activeWarnings = [];
    if(outOfRange) activeWarnings.push('Target Out of Range.');
    if(nukeTooBig) activeWarnings.push('Nuke Size >32 may Lag your Game.');
    if(invalidInputs) activeWarnings.push('Invalid Inputs.');

    if(activeWarnings.length){
      box.classList.remove('ok');
      txt.innerHTML = activeWarnings.join('<br>');
    } else {
      box.classList.add('ok');
      txt.textContent = 'All Good.';
    }
  }

  inputs.forEach(el => el.addEventListener('input', recalc));
  recalc();
})();