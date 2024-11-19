

document.body.style.overflow = "hidden";

// Blocca eventi touch non voluti che potrebbero causare scrolling o zoom
document.addEventListener("touchmove", (event) => {
    event.preventDefault(); // Blocca lo scroll con touch
}, { passive: false });

document.addEventListener("wheel", (event) => {
    event.preventDefault(); // Blocca lo scroll con rotellina del mouse
}, { passive: false });

// Disabilita lo zoom multitouch
document.addEventListener("gesturestart", (event) => {
    event.preventDefault(); // Blocca gesture di zoom
});
document.addEventListener("gesturechange", (event) => {
    event.preventDefault();
});
document.addEventListener("gestureend", (event) => {
    event.preventDefault();
});

// Prevenzione dello zoom con doppio tap
let lastTouch = 0;
document.addEventListener("touchstart", (event) => {
    const now = Date.now();
    if (now - lastTouch <= 300) {
        event.preventDefault(); // Blocca zoom doppio tap
    }
    lastTouch = now;
}, { passive: false });

let infoToSend = {
    a: false,
    b: false,
    x: false,
    y: false,
    up: false,
    down: false,
    left: false,
    right: false,
    menu: false,
    map: false,
    xbox: false,
    l1: false,
    r1: false,
    l2: false,
    r2: false,
    rStick: {
        move: false,
        x: 0,
        y: 0,
        degrees: 0,
    },
    lStick: {
        move: false,
        x: 0,
        y: 0,
        degrees: 0,
    },
};

// Contiene il mapping degli ID dei tocchi agli oggetti coinvolti
const activeTouches = new Map();

// Aggiungi eventi di tocco
document.querySelectorAll(".pressable").forEach((pressable) => {
    pressable.addEventListener("touchstart", (event) => {
        event.preventDefault();
        Array.from(event.changedTouches).forEach((touch) => {
            const target = touch.target;
            const buttonPressed = target.getAttribute("name");
            infoToSend[buttonPressed] = true;
            activeTouches.set(touch.identifier, buttonPressed);
            console.log(`${buttonPressed} pressed`);
        });
    });

    pressable.addEventListener("touchend", (event) => {
        event.preventDefault();
        Array.from(event.changedTouches).forEach((touch) => {
            const buttonPressed = activeTouches.get(touch.identifier);
            if (buttonPressed) {
                infoToSend[buttonPressed] = false;
                activeTouches.delete(touch.identifier);
                console.log(`${buttonPressed} released`);
            }
        });
    });
});

document.querySelectorAll(".stick").forEach((stick) => {
    let maxDistance = 30;
    let rightStick = stick.getAttribute("data-right-stick") === "true";

    stick.addEventListener("touchstart", (event) => {
        event.preventDefault();
        Array.from(event.changedTouches).forEach((touch) => {
            activeTouches.set(touch.identifier, { stick, startX: touch.clientX, startY: touch.clientY });
        });
    });

    stick.addEventListener("touchmove", (event) => {
        event.preventDefault();
        Array.from(event.changedTouches).forEach((touch) => {
            const stickData = activeTouches.get(touch.identifier);
            if (stickData && stickData.stick === stick) {
                const deltaX = touch.clientX - stickData.startX;
                const deltaY = touch.clientY - stickData.startY;
                const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
                const limitedX = distance > maxDistance ? (deltaX / distance) * maxDistance : deltaX;
                const limitedY = distance > maxDistance ? (deltaY / distance) * maxDistance : deltaY;

                stick.style.transform = `translate(${limitedX}px, ${limitedY}px)`;

                let degrees = Math.atan2(limitedY, limitedX) * (180 / Math.PI);
                if (degrees < 0) degrees += 360;

                if (rightStick) {
                    infoToSend.rStick.move = true;
                    infoToSend.rStick.x = limitedX;
                    infoToSend.rStick.y = limitedY;
                    infoToSend.rStick.degrees = degrees;
                } else {
                    infoToSend.lStick.move = true;
                    infoToSend.lStick.x = limitedX;
                    infoToSend.lStick.y = limitedY;
                    infoToSend.lStick.degrees = degrees;
                }
            }
        });
    });

    stick.addEventListener("touchend", (event) => {
        event.preventDefault();
        Array.from(event.changedTouches).forEach((touch) => {
            const stickData = activeTouches.get(touch.identifier);
            if (stickData && stickData.stick === stick) {
                activeTouches.delete(touch.identifier);
                stick.style.transform = `translate(0px, 0px)`;

                if (rightStick) {
                    infoToSend.rStick.move = false;
                    infoToSend.rStick.x = 0;
                    infoToSend.rStick.y = 0;
                    infoToSend.rStick.degrees = 0;
                } else {
                    infoToSend.lStick.move = false;
                    infoToSend.lStick.x = 0;
                    infoToSend.lStick.y = 0;
                    infoToSend.lStick.degrees = 0;
                }
            }
        });
    });
});

// WebSocket per inviare dati periodicamente
let socket;
const main = () => {
    socket = new WebSocket("ws://192.168.1.32:8765");
    socket.onopen = () => {
        document.querySelectorAll(".button").forEach((pressable) => {
            pressable.style.opacity = 0.8;
        });
        setInterval(sendAction, 10);
    };
    socket.onmessage = (message) => {
        console.log(message);
    };
    socket.onclose = () => {
        document.querySelectorAll(".button").forEach((pressable) => {
            pressable.style.opacity = 0.2;
        });
        setTimeout(main, 1000);
    };
};
main();

const sendAction = () => {
    socket.send(JSON.stringify(infoToSend));
};
