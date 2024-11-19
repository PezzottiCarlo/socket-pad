import asyncio
import websockets
import json
import vgamepad as vg
import time
import aiohttp
from aiohttp import web
import os

# Creazione di un'istanza di gamepad virtuale
gamepad = vg.VX360Gamepad()

# Mappatura dei tasti del controller
controller_button_mapping = {
    "a": vg.XUSB_BUTTON.XUSB_GAMEPAD_A,
    "b": vg.XUSB_BUTTON.XUSB_GAMEPAD_B,
    "x": vg.XUSB_BUTTON.XUSB_GAMEPAD_X,
    "y": vg.XUSB_BUTTON.XUSB_GAMEPAD_Y,
    "br": vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_SHOULDER,
    "bl": vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_SHOULDER,
    "menu": vg.XUSB_BUTTON.XUSB_GAMEPAD_START,
    "map": vg.XUSB_BUTTON.XUSB_GAMEPAD_BACK,
    "xbox": vg.XUSB_BUTTON.XUSB_GAMEPAD_GUIDE,
    "du": vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_UP,
    "dd": vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_DOWN,
    "dl": vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_LEFT,
    "dr": vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_RIGHT
}

# Stato precedente per pulsanti e stick
previous_state = {
    "buttons": {},
    "rStick": {"move": False, "x": 0, "y": 0, "degrees": 0},
    "lStick": {"move": False, "x": 0, "y": 0, "degrees": 0},
}

def handle_button(name, state):
    prev_state = previous_state["buttons"].get(name, False)
    if state and not prev_state:  # Da False a True
        emulate_gamepad_button_press(name)
        print(f"{name} pressed")
    elif not state and prev_state:  # Da True a False
        emulate_gamepad_button_release(name)
        print(f"{name} released")
    previous_state["buttons"][name] = state  # Aggiorna lo stato precedente

def handle_stick(stick_name, stick_data):
    prev_data = previous_state[stick_name]
    move = stick_data.get("move", False)

    if move:
        x = stick_data.get("x", 0)
        y = stick_data.get("y", 0)
        handle_stick_movement(stick_name, x, y)
    
    elif not move and prev_data["move"]:  # Da True a False (termina il movimento)
        handle_stick_release(stick_name)
        print(f"{stick_name} released")

    previous_state[stick_name] = stick_data  # Aggiorna lo stato precedente

def handle_stick_movement(stick_name, x, y):
    x=x
    y=-y
    #min = -30 max = 30 
    mapped_x = float((x)/30)
    mapped_y = float((y)/30)
    print(f"{stick_name} moved: x={mapped_x}, y={mapped_y}")
    if stick_name == "rStick":
        gamepad.right_joystick_float(x_value_float=mapped_x, y_value_float=mapped_y)
    elif stick_name == "lStick":
        gamepad.left_joystick_float(x_value_float=mapped_x, y_value_float=mapped_y)
    gamepad.update()

def handle_stick_release(stick_name):
    if stick_name == "rStick":
        gamepad.right_joystick(x_value=0, y_value=0)
    elif stick_name == "lStick":
        gamepad.left_joystick(x_value=0, y_value=0)
    gamepad.update()

def process_commands(commands):
    """
    Cicla le chiavi del JSON e invoca la funzione corretta per gestirle.
    """
    for key, value in commands.items():
        if key in ["rStick", "lStick"]:
            handle_stick(key, value)
        else:
            handle_button(key, value)

async def handle_command(websocket):
    """
    Gestisce i comandi ricevuti dal WebSocket.
    """
    print("Client connected")
    try:
        async for message in websocket:
            try:
                commands = json.loads(message)
                process_commands(commands)
            except json.JSONDecodeError:
                print("Invalid JSON received")
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")

def emulate_gamepad_button_press(button):
    if button in controller_button_mapping:
        mapped_button = controller_button_mapping[button]
        gamepad.press_button(mapped_button)
        gamepad.update()

def emulate_gamepad_button_release(button):
    if button in controller_button_mapping:
        mapped_button = controller_button_mapping[button]
        gamepad.release_button(mapped_button)
        gamepad.update()

async def main():
    # Server WebSocket
    ws_server = await websockets.serve(handle_command, "0.0.0.0", 8765)
    print("WebSocket Server started on port 8765")
    await ws_server.wait_closed()

# Esegui il server
asyncio.run(main())
