// accepts a gameState and figures out whether it's currently:
// (0) before the start of the game clock
// (1) after the start of the game clock, but before the end of the game clock
// (2) after the end of the game clock
define(['underscore'], function(_){
    return function clockStateFromGameState(gameState){
        var currentTime = new Date().getTime();
        if (currentTime < gameState.clockStart){
            return 0;
        } else if (gameState.clockStart <= currentTime && currentTime <= gameState.clockEnd) {
            return 1;
        } else {
            return 2;
        }
    };
});