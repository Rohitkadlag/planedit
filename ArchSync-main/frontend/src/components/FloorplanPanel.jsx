import React, { useState, useEffect } from "react";
import {
  generateFloorplan,
  adjustDimensions,
  addNewRoom,
} from "../api/floorplan";
import {
  convertFloorplanToWalls,
  getAvailableRooms,
  calculateRoomDimensions,
} from "../utils/floorplanUtils";

const FloorplanPanel = ({ onImportFloorplan }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [templateType, setTemplateType] = useState("1BHK");
  const [templateNumber, setTemplateNumber] = useState("template1");
  const [flatArea, setFlatArea] = useState(400);

  // States for room adjustment
  const [adjustingRoom, setAdjustingRoom] = useState("");
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [freezeArea, setFreezeArea] = useState("Yes");

  // States for adding a new room
  const [newRoomName, setNewRoomName] = useState("");
  const [adjacentRoom, setAdjacentRoom] = useState("");
  const [direction, setDirection] = useState("Top");
  const [roomArea, setRoomArea] = useState(25);
  const [roomWidth, setRoomWidth] = useState(5);
  const [roomHeight, setRoomHeight] = useState(5);

  // Current floorplan data
  const [floorplanData, setFloorplanData] = useState(null);

  // Templates
  const templates = {
    "1BHK": 10,
    "2BHK": 10,
  };

  // Common room types
  const roomTypes = [
    "Master Bedroom",
    "Bedroom",
    "Kitchen",
    "Living Room",
    "Dining Room",
    "Bathroom",
    "Common Washroom",
    "En suite Washroom",
    "Passage",
    "Foyer",
    "Study",
    "Balcony",
  ];

  // Toggle panel
  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  // Generate floorplan
  const handleGenerateFloorplan = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const template = `${templateType}_${templateNumber}`;
      const response = await generateFloorplan(
        template,
        flatArea,
        templateType
      );
      setFloorplanData(response);

      // Convert floorplan data to walls format for the canvas
      const walls = convertFloorplanToWalls(response);
      onImportFloorplan(walls, response);
    } catch (err) {
      setError(err.message || "Failed to generate floorplan");
    } finally {
      setIsLoading(false);
    }
  };

  // Adjust room dimensions
  const handleAdjustRoom = async () => {
    if (!adjustingRoom || (!width && !height)) {
      setError("Please select a room and specify at least one dimension");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const roomDimensions = {
        [adjustingRoom]: {
          width: width || 0, // Use 0 to keep existing dimension
          height: height || 0,
        },
      };

      const response = await adjustDimensions(
        roomDimensions,
        floorplanData,
        freezeArea
      );
      setFloorplanData(response);

      // Convert updated floorplan to walls
      const walls = convertFloorplanToWalls(response);
      onImportFloorplan(walls, response);

      // Reset form
      setWidth(0);
      setHeight(0);
    } catch (err) {
      setError(err.message || "Failed to adjust room dimensions");
    } finally {
      setIsLoading(false);
    }
  };

  // Add new room
  const handleAddRoom = async () => {
    if (!newRoomName || !adjacentRoom) {
      setError("Please specify room name and adjacent room");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await addNewRoom(
        newRoomName,
        adjacentRoom,
        direction,
        roomArea,
        roomWidth,
        roomHeight,
        floorplanData
      );

      setFloorplanData(response);

      // Convert updated floorplan to walls
      const walls = convertFloorplanToWalls(response);
      onImportFloorplan(walls);

      // Reset form
      setNewRoomName("");
    } catch (err) {
      setError(err.message || "Failed to add new room");
    } finally {
      setIsLoading(false);
    }
  };

  // We now use the utility function instead of this local implementation

  // Now using the utility function from floorplanUtils.js

  return (
    <div className="fixed right-0 top-20 z-10">
      <button
        onClick={togglePanel}
        className="bg-blue-600 text-white px-4 py-2 rounded-l-md shadow"
      >
        {isOpen ? "→" : "← Floorplan Tools"}
      </button>

      {isOpen && (
        <div className="bg-white shadow-lg border border-gray-300 rounded-l-md p-4 w-80">
          <h3 className="text-lg font-bold mb-4">Floorplan Generator</h3>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Generate Floorplan Section */}
            <div className="border-b pb-4">
              <h4 className="font-semibold mb-2">Generate New Floorplan</h4>

              <div className="mb-2">
                <label className="block text-sm mb-1">Flat Type</label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="1BHK">1BHK</option>
                  <option value="2BHK">2BHK</option>
                </select>
              </div>

              <div className="mb-2">
                <label className="block text-sm mb-1">Template</label>
                <select
                  value={templateNumber}
                  onChange={(e) => setTemplateNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  {[...Array(templates[templateType])].map((_, i) => (
                    <option key={i} value={`template${i + 1}`}>
                      Template {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="block text-sm mb-1">Flat Area (sq. m)</label>
                <input
                  type="number"
                  value={flatArea}
                  onChange={(e) => setFlatArea(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  min="300"
                  max="1500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum area: 1BHK: 300 sq.m, 2BHK: 525 sq.m
                </p>
              </div>

              <button
                onClick={handleGenerateFloorplan}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700"
              >
                {isLoading ? "Generating..." : "Generate Floorplan"}
              </button>
            </div>

            {floorplanData && (
              <>
                {/* Adjust Room Section */}
                <div className="border-b pb-4">
                  <h4 className="font-semibold mb-2">Adjust Room Dimensions</h4>

                  <div className="mb-2">
                    <label className="block text-sm mb-1">Select Room</label>
                    <select
                      value={adjustingRoom}
                      onChange={(e) => setAdjustingRoom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="">Select a room</option>
                      {getAvailableRooms(floorplanData).map((room) => (
                        <option key={room} value={room}>
                          {room}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="block text-sm mb-1">Width (mm)</label>
                    <input
                      type="number"
                      value={width || ""}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      placeholder="Enter width or leave blank"
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>

                  <div className="mb-2">
                    <label className="block text-sm mb-1">Height (mm)</label>
                    <input
                      type="number"
                      value={height || ""}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      placeholder="Enter height or leave blank"
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm mb-1">Freeze Area</label>
                    <select
                      value={freezeArea}
                      onChange={(e) => setFreezeArea(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      If Yes, total area will be maintained by adjusting other
                      rooms
                    </p>
                  </div>

                  <button
                    onClick={handleAdjustRoom}
                    disabled={isLoading}
                    className="bg-green-600 text-white px-4 py-2 rounded w-full hover:bg-green-700"
                  >
                    {isLoading ? "Adjusting..." : "Adjust Room"}
                  </button>
                </div>

                {/* Add New Room Section */}
                <div>
                  <h4 className="font-semibold mb-2">Add New Room</h4>

                  <div className="mb-2">
                    <label className="block text-sm mb-1">Room Name</label>
                    <select
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="">Select room type</option>
                      {roomTypes.map((room) => (
                        <option key={room} value={room}>
                          {room}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="block text-sm mb-1">Adjacent Room</label>
                    <select
                      value={adjacentRoom}
                      onChange={(e) => setAdjacentRoom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="">Select a room</option>
                      {getAvailableRooms(floorplanData).map((room) => (
                        <option key={room} value={room}>
                          {room}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="block text-sm mb-1">Direction</label>
                    <select
                      value={direction}
                      onChange={(e) => setDirection(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="Top">Top</option>
                      <option value="Bottom">Bottom</option>
                      <option value="Left">Left</option>
                      <option value="Right">Right</option>
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="block text-sm mb-1">Width (mm)</label>
                    <input
                      type="number"
                      value={roomWidth}
                      onChange={(e) => setRoomWidth(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      min="1"
                    />
                  </div>

                  <div className="mb-2">
                    <label className="block text-sm mb-1">Height (mm)</label>
                    <input
                      type="number"
                      value={roomHeight}
                      onChange={(e) => setRoomHeight(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      min="1"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm mb-1">Area (sq. m)</label>
                    <input
                      type="number"
                      value={roomArea}
                      onChange={(e) => setRoomArea(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      min="1"
                    />
                  </div>

                  <button
                    onClick={handleAddRoom}
                    disabled={isLoading}
                    className="bg-purple-600 text-white px-4 py-2 rounded w-full hover:bg-purple-700"
                  >
                    {isLoading ? "Adding..." : "Add Room"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorplanPanel;
