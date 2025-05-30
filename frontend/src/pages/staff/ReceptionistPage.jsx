import { useState, useEffect } from "react";
import socket from "../../utils/socket"; // Import socket
import MainMenuButton from "../../components/MainMenuButton";
import numFormatter from "../../utils/numFormatter";
import "../../styles/receptionist.css";

const ReceptionistPage = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionName, setSessionName] = useState("");
  const [newDriver, setNewDriver] = useState("");
  const [newDriverCarNumber, setNewDriverCarNumber] = useState("");
  const [driverList, setDriverList] = useState([]);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    socket.emit("fetchSessions", (res) => {
      if (!res.success) {
        console.error("Failed to fetch sessions:", res.error);
      }
    });

    socket.on("updateSessions", (updatedSessions) => {
      setSessions(updatedSessions);
    });

    return () => {
      socket.off("updateSessions");
    };
  }, []);

  const handleAddDriver = () => {
    const trimmedName = newDriver.trim();
    const carNumber = newDriverCarNumber.trim();

    if (!trimmedName) return;

    const parsedNumber = parseInt(carNumber, 10);

    // Extract all car numbers already in use
    const usedNumbers = driverList.map((d) =>
      typeof d.carNumber === "string" ? parseInt(d.carNumber, 10) : d.carNumber
    );

    let assignedNumber;

    if (carNumber) {
      if (isNaN(parsedNumber) || parsedNumber < 1 || parsedNumber > 99) {
        alert("Car number must be between 1 and 99.");
        return;
      }

      if (usedNumbers.includes(parsedNumber)) {
        alert(`Car number ${parsedNumber} is already taken.`);
        return;
      }

      assignedNumber = parsedNumber;
    } else {
      for (let i = 1; i <= 99; i++) {
        if (!usedNumbers.includes(i)) {
          assignedNumber = i;
          break;
        }
      }

      if (!assignedNumber) {
        alert("No available car numbers.");
        return;
      }
    }

    const isDuplicate = driverList.some((driver) => driver.name === trimmedName);
    if (isDuplicate) {
      alert("This driver name is already taken. Please choose another name.");
      return;
    }

    setDriverList([
      ...driverList,
      {
        name: trimmedName,
        carNumber: assignedNumber,
      },
    ]);

    setNewDriver("");
    setNewDriverCarNumber("");
  };

  const handleRemoveDriver = (indexToRemove) => {
    const confirmRemove = window.confirm("Are you sure you want to remove this driver?");
    if (!confirmRemove) return;

    setDriverList((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleEditDriver = (indexToEdit) => {
    if (newDriver.trim() || newDriverCarNumber.trim()) {
      alert("Clear the input fields before editing a driver.");
      return;
    }

    const driverToEdit = driverList[indexToEdit];

    // Pre-fill form fields
    setNewDriver(driverToEdit.name);
    setNewDriverCarNumber(driverToEdit.carNumber.toString());

    // Remove this driver from the list temporarily
    setDriverList((prev) => prev.filter((_, i) => i !== indexToEdit));
  };

  const handleAddSession = () => {
    const confirmAdd = window.confirm("Add a new session?");
    if (!confirmAdd) return;

    const trimmedSessionName = sessionName.trim();

    if (!trimmedSessionName) {
      alert("Session name cannot be empty.");
      return;
    }

    const duplicateName = sessions.some(
      (s) => s.raceName.trim().toLowerCase() === trimmedSessionName.toLowerCase()
    );

    if (duplicateName) {
      alert("A session with this name already exists. Please choose a different name.");
      return;
    }

    if (driverList.length === 0) {
      alert("You must add at least one driver.");
      return;
    }

    if (driverList.length > 8) {
      alert("Maximum 8 drivers are allowed per session.");
      return;
    }

    socket.emit("addRaceSession", trimmedSessionName, driverList, (response) => {
      if (response.error) {
        console.error("Error adding session:", response.error);
      } else {
        setSessionName("");
        setDriverList([]);
        setNewDriver("");
        setNewDriverCarNumber("");
      }
    });
  };

  const handleRemoveSession = (sessionId) => {
    const confirmRemove = window.confirm("Are you sure you want to remove this session?");
    if (!confirmRemove) return;

    socket.emit("removeRaceSession", sessionId, (response) => {
      if (response.error) {
        console.error("Error removing session:", response.error);
      }
    });
  };

  const handleEditSession = (session) => {
    try {
      setSelectedSession({
        ...session,
        drivers:
          typeof session.drivers === "string" ? JSON.parse(session.drivers) : session.drivers,
      });
      setEditMode(true);
    } catch (error) {
      console.error("Error parsing drivers for editing:", error);
    }
  };

  const handleAddDriverToEdit = () => {
    const trimmedName = newDriver.trim();
    const carNumber = newDriverCarNumber.trim();

    if (!trimmedName) return;

    const usedNumbers = selectedSession.drivers.map((d) =>
      typeof d.carNumber === "string" ? parseInt(d.carNumber, 10) : d.carNumber
    );

    let assignedNumber;

    if (carNumber) {
      const parsedNumber = parseInt(carNumber, 10);

      if (isNaN(parsedNumber) || parsedNumber < 1 || parsedNumber > 99) {
        alert("Car number must be a number between 1 and 99.");
        return;
      }

      if (usedNumbers.includes(parsedNumber)) {
        alert(`Car number ${parsedNumber} is already taken in this session.`);
        return;
      }

      assignedNumber = parsedNumber;
    } else {
      for (let i = 1; i <= 99; i++) {
        if (!usedNumbers.includes(i)) {
          assignedNumber = i;
          break;
        }
      }

      if (!assignedNumber) {
        alert("No available car numbers.");
        return;
      }
    }

    const isDuplicate = driverList.some((driver) => driver.name === trimmedName);
    if (isDuplicate) {
      alert("This driver name is already taken. Please choose another name.");
      return;
    }

    const updatedDrivers = [
      ...selectedSession.drivers,
      {
        name: trimmedName,
        carNumber: assignedNumber,
      },
    ];

    setSelectedSession({
      ...selectedSession,
      drivers: updatedDrivers,
    });

    setNewDriver("");
    setNewDriverCarNumber("");
  };

  const handleRemoveDriverFromEdit = (indexToRemove) => {
    const confirmRemove = window.confirm("Are you sure you want to remove this driver?");
    if (!confirmRemove) return;

    const updatedDrivers = selectedSession.drivers.filter((_, i) => i !== indexToRemove);
    setSelectedSession({ ...selectedSession, drivers: updatedDrivers });
  };

  const handleEditDriverFromEdit = (indexToEdit) => {
    const driver = selectedSession.drivers[indexToEdit];

    // Don't allow editing if there's pending input
    if (newDriver.trim() || newDriverCarNumber.trim()) {
      alert("Please clear the input fields or add the driver before editing another.");
      return;
    }

    // Set form values
    setNewDriver(driver.name);
    setNewDriverCarNumber(driver.carNumber.toString());

    // Store a temporary marker so we know it's an edit, not new
    setSelectedSession((prev) => ({
      ...prev,
      drivers: prev.drivers.filter((_, i) => i !== indexToEdit),
    }));
  };

  const handleSaveEdit = () => {
    const confirmSave = window.confirm("Are you sure you want to save this edit?");
    if (!confirmSave) return;

    const trimmedName = selectedSession.raceName.trim();

    if (!trimmedName) {
      alert("Session name cannot be empty.");
      return;
    }

    const duplicateName = sessions.some(
      (s) =>
        s.id !== selectedSession.id && s.raceName.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateName) {
      alert("A session with this name already exists. Please choose a different name.");
      return;
    }

    if (!Array.isArray(selectedSession.drivers) || selectedSession.drivers.length === 0) {
      alert("You must have at least one driver.");
      return;
    }

    if (selectedSession.drivers.length > 8) {
      alert("Maximum 8 drivers are allowed per session.");
      return;
    }

    socket.emit(
      "editRaceSession",
      selectedSession.id,
      { ...selectedSession, raceName: trimmedName },
      (response) => {
        if (response.error) {
          console.error("Error editing session:", response.error);
        } else {
          setEditMode(false);
          setSelectedSession(null);
          setNewDriver("");
          setNewDriverCarNumber("");
        }
      }
    );
  };

  const handleReorderSession = (sessionId, direction) => {
    socket.emit("reorderRaceSession", sessionId, direction, (response) => {
      if (response.error) {
        console.error("Error reordering session:", response.error);
      }
    });
  };

  return (
    <div className="receptionist-page-wrapper">
      <div className="receptionist-container roboto-mono-regular">
        <MainMenuButton />

        <div className="receptionist-header">
          <h1 className="roboto-mono-bold">Receptionist Page</h1>
        </div>

        <div className="receptionist-content-flex">
          {/* === Add/Edit Section === */}
          <div className="receptionist-section add-edit-section">
            <h2 className="roboto-mono-bold">
              {editMode ? "Edit Race Session" : "Add New Race Session"}
            </h2>

            <div className="input-group">
              <input
                type="text"
                placeholder="Race Name"
                value={editMode ? selectedSession.raceName : sessionName}
                maxLength={25}
                onChange={(e) =>
                  editMode
                    ? setSelectedSession({ ...selectedSession, raceName: e.target.value })
                    : setSessionName(e.target.value)
                }
              />
              <span className="char-count">
                ({(editMode ? selectedSession.raceName : sessionName).length}/25)
              </span>
            </div>

            <div className="input-group input-group-driver-add">
              <input
                type="text"
                placeholder="Driver Name"
                value={newDriver}
                maxLength={25}
                onChange={(e) => setNewDriver(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    editMode ? handleAddDriverToEdit() : handleAddDriver();
                  }
                }}
              />
              <span className="char-count">({newDriver.length}/25)</span>

              <input
                type="text"
                placeholder="Car Number (1-99)"
                className="input-car-number"
                value={newDriverCarNumber}
                onChange={(e) => setNewDriverCarNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    editMode ? handleAddDriverToEdit() : handleAddDriver();
                  }
                }}
              />

              <button
                className="action-button"
                onClick={editMode ? handleAddDriverToEdit : handleAddDriver}
                disabled={editMode ? selectedSession.drivers.length >= 8 : driverList.length >= 8}
              >
                Add Driver
              </button>
            </div>

            <div
              className={`driver-counter ${
                (editMode ? selectedSession.drivers.length : driverList.length) === 8
                  ? "limit-reached"
                  : ""
              }`}
            >
              Drivers: {editMode ? selectedSession.drivers.length : driverList.length}/8
            </div>

            <ul className="driver-list driver-list-scroll">
              {(editMode ? selectedSession.drivers : driverList).map((driver, index) => (
                <li key={index}>
                  <div className="driver-info">
                    <span>{driver.name}</span>
                    <span>#{driver.carNumber}</span>
                  </div>
                  <div className="driver-actions">
                    <button
                      className="action-button"
                      onClick={() =>
                        editMode ? handleEditDriverFromEdit(index) : handleEditDriver(index)
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="action-button danger"
                      onClick={() =>
                        editMode ? handleRemoveDriverFromEdit(index) : handleRemoveDriver(index)
                      }
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {editMode ? (
              <div className="session-actions">
                <button className="action-button" onClick={handleSaveEdit}>
                  Save
                </button>
                <button
                  className="action-button danger"
                  onClick={() => {
                    const confirmCancel = window.confirm("Discard changes?");
                    if (!confirmCancel) return;
                    setEditMode(false);
                    setSelectedSession(null);
                    setNewDriver("");
                    setNewDriverCarNumber("");
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button className="action-button" onClick={handleAddSession}>
                Add Race Session
              </button>
            )}
          </div>

          {/* === Upcoming Sessions Section === */}
          <div className="receptionist-section upcoming-sessions-section">
            <h2 className="roboto-mono-bold">Upcoming Sessions</h2>
            <div className="session-list">
              {sessions.map((session) => (
                <div key={session.id} className="session-item">
                  <div className="session-header">
                    <h3 className="roboto-mono-medium">{session.raceName}</h3>
                  </div>
                  <div className="session-drivers">
                    {(() => {
                      let driversArray;
                      try {
                        driversArray =
                          typeof session.drivers === "string"
                            ? JSON.parse(session.drivers)
                            : session.drivers;
                      } catch {
                        driversArray = [];
                      }
                      return Array.isArray(driversArray) && driversArray.length ? (
                        driversArray.map((driver, i) => (
                          <span key={i} className="driver-tag">
                            {driver.name} #{numFormatter(driver.carNumber)}
                          </span>
                        ))
                      ) : (
                        <span className="driver-tag">No drivers</span>
                      );
                    })()}
                  </div>
                  <div className="session-actions">
                    <button className="action-button" onClick={() => handleEditSession(session)}>
                      Edit
                    </button>
                    <button
                      className="action-button"
                      onClick={() => handleReorderSession(session.id, 1)}
                    >
                      Move Up
                    </button>
                    <button
                      className="action-button"
                      onClick={() => handleReorderSession(session.id, -1)}
                    >
                      Move Down
                    </button>
                    <button
                      className="action-button danger"
                      onClick={() => handleRemoveSession(session.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionistPage;
