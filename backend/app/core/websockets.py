from fastapi import WebSocket
from typing import Dict, List
import uuid

class ConnectionManager:
    def __init__(self):
        # This dictionary maps a queue_id to a list of open WebSocket connections
        self.active_connections: Dict[uuid.UUID, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, queue_id: uuid.UUID):
        await websocket.accept()
        if queue_id not in self.active_connections:
            self.active_connections[queue_id] = []
        self.active_connections[queue_id].append(websocket)

    def disconnect(self, websocket: WebSocket, queue_id: uuid.UUID):
        if queue_id in self.active_connections:
            self.active_connections[queue_id].remove(websocket)
            if not self.active_connections[queue_id]:  # clean up empty lists
                del self.active_connections[queue_id]

    async def broadcast_to_queue(self, queue_id: uuid.UUID, message: dict):
        if queue_id in self.active_connections:
            for connection in self.active_connections[queue_id]:
                await connection.send_json(message)

# Create a single instance of the manager that our whole app will share
manager = ConnectionManager()
