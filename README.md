# vehicle-tokens
Easily attach tokens to a vehicle to move every token at once.

Enable vehicle icon on the token hud by checking the "Vehicle Token" checkbox in the token configuration on the Identity tab.

In the left column of the token hud of vehicles there will be a control with a link icon that will toggle attachment of tokens on top of the token image. 

This control will be active (highlighted) if there are tokens attached. Attached tokens cannot be moved and should not be modified while attached. 

# settings

  - Automatic Toggle on Turn: will attach tokens at the start of the vehicle's turn and detatch at the end
  - Transparency Detection: When enabled, tokens will not be attached if they are over a fully transparent part of the vehicle token's image.
  - Animate: Determines whether to animate the vehicle and tokens attached to it. Rotation animations look strange for tokens near the edge of large vehicles. Changes will not be reflected until tokens are attached again.
  - Animation Duration: To keep animations synced to avoid weirdness, all animations need to have the same duration. In milliseconds.

# Updates

1.3.0

  - added settings to toggle animation and animation duration
  
1.2.0
  
  - disabled animation 
  - moved vehicle toggle to the identity tab in the token configuration
