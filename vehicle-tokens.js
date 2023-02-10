Hooks.on('renderTokenConfig', (app, html, data)=>{
  if (!game.user.isGM) return;
  html.find('div.tab[data-tab="appearance"]').append($(`
        <div class="form-group">
          <label>Vehicle Token</label>
          <input type="checkbox" name="flags.vehicle-tokens.vehicle">
        </div>
  `))
  html.find('input[name="flags.vehicle-tokens.vehicle"]').prop( "checked", app.token.flags['vehicle-tokens']?.vehicle)
  //.change(function(){ app.object.setFlag('vehicle-tokens', 'vehicle', $(this).is(':checked'))  });
});
Hooks.on('renderTokenHUD', (app, html, hudData)=>{
  if (!game.user.isGM) return;
  if (!app.object.document.flags['vehicle-tokens']?.vehicle) return;
  let $toggleRide = $(`<div class="control-icon toggle-ride ${app.object.document.flags['vehicle-tokens']?.active?'active':''} " title="Actor Sheet">
  ${app.object.document.flags['vehicle-tokens']?.active?'<i class="fas fa-unlink"></i>':'<i class="fas fa-link"></i>'}</div>`)
  .click(async function(){
    let active = await app.object.toggleRide();
    console.log(active);
    if (active) $(this).addClass('active').html('<i class="fas fa-unlink"></i>');//app.object.document.flags['vehicle-tokens']?.
    else $(this).removeClass('active').html('<i class="fas fa-link"></i>');
  });
  html.find('.col.left').append($toggleRide);
});
Hooks.on('updateCombat', (combat, update, options, user)=>{
  if (!game.user.isGM) return;
  if (!game.settings.get('vehicle-tokens', 'autoOnTurn')) return;
  let previous = combat.scene.tokens.get(combat.previous.tokenId)
  if (previous.flags['vehicle-tokens']?.vehicle && previous.flags['vehicle-tokens']?.active) previous.object.toggleRide();
  if (!combat.combatant.token.flags['vehicle-tokens']?.vehicle) return;
  if (combat.combatant.token.flags['vehicle-tokens']?.active) return;
  combat.combatant.token.object.toggleRide();
});
Token.prototype.toggleRide = async function() {
  if (!game.user.isGM) return;
  var token = this;
  
  if (token.document.flags['token-attacher']?.attached?.Token?.length) {
    ui.notifications.notify(token.document.flags['token-attacher']?.attached?.Token.map(t=>canvas.scene.tokens.get(t).name).join(', ') + ' dettached from ' + token.document.name)
    
    await tokenAttacher.detachElementsFromToken(token.document.flags['token-attacher']?.attached?.Token.map(t=>canvas.scene.tokens.get(t).object), token, true);
    await token.document.setFlag('vehicle-tokens', 'active', false);
    return false;
  }
  function inside(point, vs) {
    var x = point[0], y = point[1];
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      var xi = vs[i][0], yi = vs[i][1];
      var xj = vs[j][0], yj = vs[j][1];
      var intersect = ((yi > y) != (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
  var rotate = function(cx, cy, x, y, radians) {
    var cos = Math.cos(radians),
      sin = Math.sin(radians),
      nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
      ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return [nx, ny];
  }

  let {x, y, height, width} = token.mesh;
  let radians = token.mesh.transform._rotation
  const c = document.createElement(`canvas`);
  c.setAttribute("width", width);
  c.setAttribute("height", height);
  const ctx = c.getContext("2d");
  const image = new Image();
  image.src = token.document.texture.src;
  image.onload = async function() {
    ctx.drawImage(image, 0, 0, width, height); 
    let tl = rotate(x, y, x-width/2,  y-height/2, radians),
    bl = rotate(x, y, x-width/2, y+height/2, radians),
    tr = rotate(x, y, x+width/2, y-height/2, radians),
    br = rotate(x, y, x+width/2, y+height/2, radians);
    let polygon = [tl, tr, br, bl];
    let elements = [];
    for (let t of canvas.tokens.objects.children.filter(t=>inside([t.mesh.x, t.mesh.y], polygon) && t.id!=token.id)) {
      if (!game.settings.get('vehicle-tokens', 'transparency')) {
        elements.push(t)
        continue;
      }
      let [tx, ty] = rotate(x, y, t.mesh.x, t.mesh.y, radians)
      tx-=x-width/2
      ty-=y-height/2
      const imageData = ctx.getImageData(tx, ty, 1, 1);
      if(imageData.data[3] !== 0) elements.push(t);
    }
    if (!elements.length) {
      await token.document.setFlag('vehicle-tokens', 'active', false);
      ui.notifications.notify('No tokens to attach to ' + token.document.name);
      return false;
    }
    await tokenAttacher.attachElementsToToken(elements, token);
    ui.notifications.notify(elements.map(t=>t.document.name).join(', ') + ' attached to ' + token.document.name)
    
    await token.document.setFlag('vehicle-tokens', 'active', !!elements.length);
    return true;
  }
  return true;
}
Hooks.once("setup", async () => {
  game.settings.register('vehicle-tokens', 'autoOnTurn', {
    name: `Automatically Toggle on Turn`,
    hint: `Determines whether to automatically link tokens during the vehicle's turn in combat`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => { }
  });
  game.settings.register('vehicle-tokens', 'transparency', {
    name: `Transparency Detection`,
    hint: `Determines whether to attach tokens if they are over a transparent part of the token texture.`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => { }
  });
});