import React, { useState, useEffect } from "react";
import {
  calculateRoomDimensions,
  getAvailableRooms,
} from "../utils/floorplanUtils";

const RoomInfoPanel = ({ floorplanData, walls }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [roomDimensions, setRoomDimensions] = useState({});
  const [totalArea, setTotalArea] = useState(0);

  // Calculate room dimensions when floorplan data changes
  useEffect(() => {
    if (floorplanData) {
      const dimensions = calculateRoomDimensions(floorplanData);
      setRoomDimensions(dimensions);

      // Calculate total area
      const total = Object.values(dimensions).reduce(
        (sum, room) => sum + room.area,
        0
      );
      setTotalArea(parseFloat(total.toFixed(2)));
    }
  }, [floorplanData]);

  // Convert mm to meters for display
  const toMeters = (valueMm) => {
    return (valueMm / 1000).toFixed(2);
  };

  // Format area in square meters
  const formatArea = (areaMm2) => {
    return (areaMm2 / 1000000).toFixed(2);
  };

  // Toggle panel
  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  if (!floorplanData && walls?.length === 0) {
    return null;
  }

  return (
    <div className="fixed left-0 top-20 z-10">
      <button
        onClick={togglePanel}
        className="bg-green-600 text-white px-4 py-2 rounded-r-md shadow"
      >
        {isOpen ? "←" : "Room Info →"}
      </button>

      {isOpen && (
        <div className="bg-white shadow-lg border border-gray-300 rounded-r-md p-4 w-80">
          <h3 className="text-lg font-bold mb-4">Room Dimensions</h3>

          <div className="mb-4 p-2 bg-blue-50 rounded border border-blue-200">
            <p className="font-semibold">
              Total Area: {formatArea(totalArea)} m²
            </p>
          </div>

          <div className="space-y-2">
            {getAvailableRooms(floorplanData).map((roomName) => {
              const room = roomDimensions[roomName];
              if (!room) return null;

              return (
                <div
                  key={roomName}
                  className="p-3 border rounded-md hover:bg-gray-50"
                >
                  <h4 className="font-semibold text-lg">{roomName}</h4>
                  <div className="flex justify-between text-sm">
                    <span>Width:</span>
                    <span>
                      {room.width} mm ({toMeters(room.width)} m)
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Height:</span>
                    <span>
                      {room.height} mm ({toMeters(room.height)} m)
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Area:</span>
                    <span>{formatArea(room.area)} m²</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomInfoPanel;
