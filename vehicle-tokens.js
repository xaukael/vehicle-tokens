Hooks.on('renderTokenConfig', (app, html, data)=>{
  if (!game.user.isGM) return;
  html.find('div.tab[data-tab="appearance"]').append($(`
        <div class="form-group">
          <label>Vehicle Token</label>
          <input type="checkbox" name="flags.vehicle-tokens.vehicle">
        </div>
  `))
  html.find('input[name="flags.vehicle-tokens.vehicle"]').prop( "checked", app.token.flags['vehicle-tokens']?.vehicle)
  .change(function(){ app.object.setFlag('vehicle-tokens', 'vehicle', $(this).is(':checked'))  });
});

Hooks.on('renderTokenHUD', (app, html, hudData)=>{
  if (!game.user.isGM) return;
  //console.log(app.object.document)${app.object.document.flags['vehicle-tokens']?.vehicle?'active':''} 
  if (!app.object.document.flags['vehicle-tokens']?.vehicle) return;
  let $toggleRide = $(`<div class="control-icon toggle-ride ${app.object.document.flags['vehicle-tokens']?.active?'active':''} " title="Actor Sheet">
  ${app.object.document.flags['vehicle-tokens']?.active?'<i class="fas fa-unlink"></i>':'<i class="fas fa-link"></i>'}</div>`)
  .click(async function(){
    await app.object.toggleRide();
    if (app.object.document.flags['vehicle-tokens']?.active) $(this).addClass('active').html('<i class="fas fa-unlink"></i>');
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
})

Token.prototype.toggleRide = async function() {
  if (!game.user.isGM) return;
  var token = this;
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
  };
  
  var rotate = function(cx, cy, x, y, radians) {
    var cos = Math.cos(radians),
      sin = Math.sin(radians),
      nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
      ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return [nx, ny];
  }

  if (token.document.flags['token-attacher']?.attached?.Token?.length) {
  
    ui.notifications.notify(token.document.flags['token-attacher']?.attached?.Token.map(t=>canvas.scene.tokens.get(t).name).join(', ') + ' now not riding ' + token.document.name)
    await token.document.setFlag('vehicle-tokens', 'active', false);
    tokenAttacher.detachElementsFromToken(token.document.flags['token-attacher']?.attached?.Token.map(t=>canvas.scene.tokens.get(t).object), token, true);
    return;
  }
  let {x, y, height, width} = token.mesh;
  let radians = token.mesh.transform._rotation
  let tl = rotate(x, y, x-width/2,  y-height/2, radians),
   bl = rotate(x, y, x-width/2, y+height/2, radians),
   tr = rotate(x, y, x+width/2, y-height/2, radians),
   br = rotate(x, y, x+width/2, y+height/2, radians);
  let polygon = [tl, tr, br, bl];
  let elements = canvas.tokens.objects.children.filter(t=>inside([t.mesh.x, t.mesh.y], polygon) && t.id!=token.id)
  console.log(elements)
  if (!elements.length) return ui.notifications.notify('No tokens to ride ' + token.document.name);
  await tokenAttacher.attachElementsToToken(elements, token);
  await token.document.setFlag('vehicle-tokens', 'active', true);
  ui.notifications.notify(elements.map(t=>t.document.name).join(', ') + ' now riding ' + token.document.name)
}

Hooks.once("setup", async () => {
  game.settings.register('vehicle-tokens', 'autoOnTurn', {
    name: `Automatically Toggle on Turn`,
    hint: `Determines whether to automatically link tokens during the vehicle's turn in combat`,
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => { }
  });
});