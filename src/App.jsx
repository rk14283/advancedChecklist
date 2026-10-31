import { useState } from "react";
import "./App.css";
import { supabase } from "./lib/supabaseClient";

const initialGoals = [
  {
    id: 1,
    title: "High-paying finance job",
    description:
      "Build the skills, knowledge, and experience for a strong finance career.",
  },
  {
    id: 2,
    title: "Lutametrics",
    description: "Build Lutametrics into a real and useful product.",
  },
];

const initialColumns = [
  {
    id: 1,
    title: "Thesis",
    tasks: [
      { id: 1, title: "Finish literature review", completed: false },
      { id: 2, title: "Complete methodology", completed: false },
      { id: 3, title: "Write results", completed: false },
      { id: 4, title: "Final editing", completed: false },
    ],
  },
  {
    id: 2,
    title: "Financial Mathematics",
    tasks: [
      { id: 5, title: "Probability theory", completed: false },
      { id: 6, title: "Stochastic processes", completed: false },
      { id: 7, title: "Brownian motion", completed: false },
      { id: 8, title: "Stochastic calculus", completed: false },
    ],
  },
  {
    id: 3,
    title: "Lutametrics",
    tasks: [
      { id: 9, title: "Design database", completed: false },
      { id: 10, title: "Build frontend", completed: false },
      { id: 11, title: "Build backend", completed: false },
      { id: 12, title: "Deploy MVP", completed: false },
    ],
  },
  {
    id: 4,
    title: "Finance Career",
    tasks: [
      { id: 13, title: "Update CV", completed: false },
      { id: 14, title: "Research target firms", completed: false },
      { id: 15, title: "Prepare technical questions", completed: false },
    ],
  },
  {
    id: 5,
    title: "Programming",
    tasks: [
      { id: 16, title: "Improve React", completed: false },
      { id: 17, title: "Improve Python", completed: false },
    ],
  },
  {
    id: 6,
    title: "Personal",
    tasks: [],
  },
];

function App() {
  const [page, setPage] = useState("workspace");
  const [theme, setTheme] = useState("light");

  const [goals, setGoals] = useState(initialGoals);
  const [columns, setColumns] = useState(initialColumns);
  const [draggedColumnId, setDraggedColumnId] = useState(null);
const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const [archive, setArchive] = useState([]);

  const [newColumn, setNewColumn] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);

  // Currently edited task
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskText, setEditingTaskText] = useState("");

  /*
   * --------------------------------
   * LONG TERM GOALS
   * --------------------------------
   */

  function addGoal() {
    const title = window.prompt("What is your long-term goal?");

    if (!title || !title.trim()) return;

    setGoals((current) => [
      ...current,
      {
        id: Date.now(),
        title: title.trim(),
        description: "",
      },
    ]);
  }

  function deleteGoal(goalId) {
    if (!window.confirm("Delete this long-term goal?")) return;

    setGoals((current) =>
      current.filter((goal) => goal.id !== goalId)
    );
  }

  /*
   * --------------------------------
   * COLUMNS
   * --------------------------------
   */

  function addColumn() {
    const title = newColumn.trim();

    if (!title) return;

    setColumns((current) => [
      ...current,
      {
        id: Date.now(),
        title,
        tasks: [],
      },
    ]);

    setNewColumn("");
    setAddingColumn(false);
  }

  function deleteColumn(columnId) {
    if (
      !window.confirm(
        "Delete this column and all of its active tasks?"
      )
    ) {
      return;
    }

    setColumns((current) =>
      current.filter((column) => column.id !== columnId)
    );
  }

  /*
   * --------------------------------
   * INLINE COLUMN RENAMING
   * --------------------------------
   */

  function renameColumn(columnId, newTitle) {
    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? {
              ...column,
              title: newTitle,
            }
          : column
      )
    );
  }

  /*
   * --------------------------------
   * Move columns 
   * --------------------------------
   */
  const handleColumnDragStart = (event, columnId) => {
  setDraggedColumnId(columnId);
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", columnId);
};

const handleColumnDragOver = (event, columnId) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";

  if (columnId !== draggedColumnId) {
    setDragOverColumnId(columnId);
  }
};

const handleColumnDrop = (event, targetColumnId) => {
  event.preventDefault();

  if (!draggedColumnId || draggedColumnId === targetColumnId) {
    setDraggedColumnId(null);
    setDragOverColumnId(null);
    return;
  }

  setColumns((currentColumns) => {
    const draggedColumn = currentColumns.find(
      (column) => column.id === draggedColumnId
    );

    const remainingColumns = currentColumns.filter(
      (column) => column.id !== draggedColumnId
    );

    const targetIndex = remainingColumns.findIndex(
      (column) => column.id === targetColumnId
    );

    remainingColumns.splice(targetIndex, 0, draggedColumn);

    return remainingColumns;
  });

  setDraggedColumnId(null);
  setDragOverColumnId(null);
};

const handleColumnDragEnd = () => {
  setDraggedColumnId(null);
  setDragOverColumnId(null);
};

  /*
   * --------------------------------
   * TASKS
   * --------------------------------
   */

  function addTask(columnId) {
    const title = window.prompt("What task do you want to add?");

    if (!title || !title.trim()) return;

    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? {
              ...column,
              tasks: [
                ...column.tasks,
                {
                  id: Date.now(),
                  title: title.trim(),
                  completed: false,
                },
              ],
            }
          : column
      )
    );
  }

  /*
   * --------------------------------
   * COMPLETE / UNCOMPLETE TASK
   * --------------------------------
   *
   * Completing a task does NOT archive it.
   * It remains in the column.
   */

  function toggleTask(columnId, taskId) {
    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? {
              ...column,
              tasks: column.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      completed: !task.completed,
                    }
                  : task
              ),
            }
          : column
      )
    );
  }

  /*
   * --------------------------------
   * EDIT TASK
   * --------------------------------
   */

  function startEditingTask(task) {
    setEditingTask(task.id);
    setEditingTaskText(task.title);
  }

  function saveTaskEdit(columnId, taskId) {
    const newTitle = editingTaskText.trim();

    if (!newTitle) {
      cancelTaskEdit();
      return;
    }

    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? {
              ...column,
              tasks: column.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      title: newTitle,
                    }
                  : task
              ),
            }
          : column
      )
    );

    cancelTaskEdit();
  }

  function cancelTaskEdit() {
    setEditingTask(null);
    setEditingTaskText("");
  }

  /*
   * --------------------------------
   * ARCHIVE TASK
   * --------------------------------
   *
   * Only completed tasks can be archived.
   */

  function archiveTask(columnId, taskId) {
    const column = columns.find(
      (column) => column.id === columnId
    );

    if (!column) return;

    const task = column.tasks.find(
      (task) => task.id === taskId
    );

    if (!task || !task.completed) return;

    const archivedTask = {
      ...task,
      archiveId: Date.now(),
      originalColumn: column.title,
      archivedAt: new Date().toISOString(),
    };

    setArchive((current) => [
      archivedTask,
      ...current,
    ]);

    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? {
              ...column,
              tasks: column.tasks.filter(
                (task) => task.id !== taskId
              ),
            }
          : column
      )
    );
  }

  /*
   * --------------------------------
   * DELETE ACTIVE TASK
   * --------------------------------
   */

  function deleteTask(columnId, taskId) {
    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? {
              ...column,
              tasks: column.tasks.filter(
                (task) => task.id !== taskId
              ),
            }
          : column
      )
    );
  }

  /*
   * --------------------------------
   * ARCHIVE
   * --------------------------------
   */

  function restoreTask(archiveId) {
    const task = archive.find(
      (item) => item.archiveId === archiveId
    );

    if (!task) return;

    const existingColumn = columns.find(
      (column) => column.title === task.originalColumn
    );

    if (existingColumn) {
      setColumns((current) =>
        current.map((column) =>
          column.id === existingColumn.id
            ? {
                ...column,
                tasks: [
                  ...column.tasks,
                  {
                    id: Date.now(),
                    title: task.title,
                    completed: false,
                  },
                ],
              }
            : column
        )
      );
    } else {
      setColumns((current) => [
        ...current,
        {
          id: Date.now(),
          title: task.originalColumn,
          tasks: [
            {
              id: Date.now() + 1,
              title: task.title,
              completed: false,
            },
          ],
        },
      ]);
    }

    setArchive((current) =>
      current.filter(
        (item) => item.archiveId !== archiveId
      )
    );
  }

  function permanentlyDeleteArchiveItem(archiveId) {
    setArchive((current) =>
      current.filter(
        (item) => item.archiveId !== archiveId
      )
    );
  }

  /*
   * --------------------------------
   * PROGRESS
   * --------------------------------
   */

  const activeTasks = columns.reduce(
    (total, column) =>
      total +
      column.tasks.filter(
        (task) => !task.completed
      ).length,
    0
  );

  const completedTasks =
    columns.reduce(
      (total, column) =>
        total +
        column.tasks.filter(
          (task) => task.completed
        ).length,
      0
    ) + archive.length;

  const totalTasks = activeTasks + completedTasks;

  const overallProgress =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedTasks / totalTasks) * 100
        );

  /*
   * --------------------------------
   * RENDER
   * --------------------------------
   */

return (
  <div className={`app ${theme}`}>

    {/* HEADER */}

    <header className="header">

      <div className="brand">
        <h1>Project OS</h1>

        <p>
          Long-term goals → current focus → action
        </p>
      </div>

      <div className="header-actions">

        <nav className="navigation">

          <button
            className={
              page === "workspace"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setPage("workspace")}
          >
            Workspace
          </button>

          <button
            className={
              page === "archive"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setPage("archive")}
          >
            Archive

            {archive.length > 0 && (
              <span className="archive-count">
                {archive.length}
              </span>
            )}
          </button>

        </nav>

        <button
          className="theme-toggle"
          onClick={() =>
            setTheme(
              theme === "light"
                ? "dark"
                : "light"
            )
          }
          title="Toggle theme"
        >
          {theme === "light" ? "☾" : "☀"}
        </button>

        <div className="overall-progress">
          <span>Overall</span>

          <strong>
            {overallProgress}%
          </strong>
        </div>

      </div>

    </header>

    {/* --------------------------------
        WORKSPACE
        -------------------------------- */}

    {page === "workspace" && (

      <main>

        {/* LONG TERM GOALS */}

        <section className="goals-section">

          <div className="section-header">

            <div>
              <span className="label">
                DIRECTION
              </span>

              <h2>
                Long-term goals
              </h2>
            </div>

            <button
              className="add-button"
              onClick={addGoal}
            >
              + Add goal
            </button>

          </div>

          <div className="goals">

            {goals.map((goal) => (

              <div
                className="goal-card"
                key={goal.id}
              >

                <div className="goal-card-top">

                  <div className="goal-symbol">
                    ◎
                  </div>

                  <button
                    className="small-button"
                    onClick={() =>
                      deleteGoal(goal.id)
                    }
                  >
                    ×
                  </button>

                </div>

                <h3>
                  {goal.title}
                </h3>

                <p>
                  {goal.description ||
                    "Add a description for this goal."}
                </p>

              </div>

            ))}

            {goals.length === 0 && (

              <button
                className="empty-goal"
                onClick={addGoal}
              >
                + Add your first long-term goal
              </button>

            )}

          </div>

        </section>

        {/* CURRENT FOCUS */}

        <section className="workspace-section">

          <div className="section-header">

            <div>
              <span className="label">
                EXECUTION
              </span>

              <h2>
                Current focus
              </h2>
            </div>

            {!addingColumn && (

              <button
                className="add-button"
                onClick={() =>
                  setAddingColumn(true)
                }
              >
                + Add column
              </button>

            )}

          </div>

          {/* ADD COLUMN */}

          {addingColumn && (

            <div className="new-column-form">

              <input
                autoFocus
                value={newColumn}
                onChange={(event) =>
                  setNewColumn(
                    event.target.value
                  )
                }
                placeholder="Column name..."
                onKeyDown={(event) => {

                  if (event.key === "Enter") {
                    addColumn();
                  }

                  if (event.key === "Escape") {
                    setAddingColumn(false);
                    setNewColumn("");
                  }

                }}
              />

              <button onClick={addColumn}>
                Add
              </button>

              <button
                className="cancel-button"
                onClick={() => {
                  setAddingColumn(false);
                  setNewColumn("");
                }}
              >
                Cancel
              </button>

            </div>

          )}

          {/* COLUMNS */}

          <div className="columns">

            {columns.map((column) => (

              <div
                className={`column ${
                  draggedColumnId === column.id
                    ? "dragging"
                    : ""
                } ${
                  dragOverColumnId === column.id
                    ? "drag-over"
                    : ""
                }`}
                key={column.id}
                onDragOver={(event) =>
                  handleColumnDragOver(
                    event,
                    column.id
                  )
                }
                onDrop={(event) =>
                  handleColumnDrop(
                    event,
                    column.id
                  )
                }
              >

                {/* COLUMN HEADER */}

                <div className="column-header">

                  {/* DRAG HANDLE */}

                  <div
                    className="drag-handle"
                    draggable
                    onDragStart={(event) =>
                      handleColumnDragStart(
                        event,
                        column.id
                      )
                    }
                    onDragEnd={handleColumnDragEnd}
                    title="Drag to move column"
                    aria-label="Drag to move column"
                  >
                    ⋮⋮
                  </div>

                  <div className="column-title-wrapper">

                    <input
                      className="column-title"
                      value={column.title}
                      onChange={(event) =>
                        renameColumn(
                          column.id,
                          event.target.value
                        )
                      }
                    />

                    <span>
                      {column.tasks.filter(
                        (task) => !task.completed
                      ).length} active
                    </span>

                  </div>

                  <button
                    className="delete-column-button"
                    onClick={() =>
                      deleteColumn(
                        column.id
                      )
                    }
                  >
                    ×
                  </button>

                </div>

                {/* TASKS */}

                <div className="tasks">

                  {column.tasks.map((task) => (

                    <div
                      className={
                        task.completed
                          ? "task completed-task"
                          : "task"
                      }
                      key={task.id}
                    >

                      {/* CHECKBOX */}

                      <button
                        className={
                          task.completed
                            ? "checkbox checked"
                            : "checkbox"
                        }
                        onClick={() =>
                          toggleTask(
                            column.id,
                            task.id
                          )
                        }
                        title={
                          task.completed
                            ? "Mark as active"
                            : "Complete task"
                        }
                      >
                        {task.completed ? "✓" : ""}
                      </button>

                      {/* TASK TITLE */}

                      {editingTask === task.id ? (

                        <input
                          autoFocus
                          className="task-title-input"
                          value={editingTaskText}
                          onChange={(event) =>
                            setEditingTaskText(
                              event.target.value
                            )
                          }
                          onBlur={() =>
                            saveTaskEdit(
                              column.id,
                              task.id
                            )
                          }
                          onKeyDown={(event) => {

                            if (
                              event.key === "Enter"
                            ) {
                              saveTaskEdit(
                                column.id,
                                task.id
                              );
                            }

                            if (
                              event.key === "Escape"
                            ) {
                              cancelTaskEdit();
                            }

                          }}
                        />

                      ) : (

                        <span
                          className="task-title"
                          onClick={() =>
                            startEditingTask(task)
                          }
                          title="Click to edit"
                        >
                          {task.title}
                        </span>

                      )}

                      {/* ARCHIVE BUTTON */}

                      {task.completed && (
                        <button
                          className="archive-task-button"
                          onClick={() =>
                            archiveTask(
                              column.id,
                              task.id
                            )
                          }
                          title="Archive completed task"
                        >
                          Archive
                        </button>
                      )}

                      {/* DELETE BUTTON */}

                      <button
                        className="delete-task"
                        onClick={() =>
                          deleteTask(
                            column.id,
                            task.id
                          )
                        }
                        title="Delete task"
                      >
                        ×
                      </button>

                    </div>

                  ))}

                  {column.tasks.length === 0 && (

                    <div className="empty-tasks">
                      No tasks
                    </div>

                  )}

                </div>

                {/* ADD TASK */}

                <button
                  className="add-task"
                  onClick={() =>
                    addTask(column.id)
                  }
                >
                  + Add task
                </button>

              </div>

            ))}

            {/* ADD COLUMN */}

            <button
              className="add-column-card"
              onClick={() =>
                setAddingColumn(true)
              }
            >
              <span>+</span>
              Add column
            </button>

          </div>

        </section>

      </main>

    )}

    {/* --------------------------------
        ARCHIVE
        -------------------------------- */}

    {page === "archive" && (

      <main className="archive-page">

        <div className="archive-header">

          <div>
            <span className="label">
              HISTORY
            </span>

            <h2>
              Archive
            </h2>

            <p>
              Completed tasks that you have
              chosen to archive.
            </p>
          </div>

        </div>

        {archive.length === 0 ? (

          <div className="empty-archive">

            <div className="archive-icon">
              ✓
            </div>

            <h3>
              Nothing archived yet
            </h3>

            <p>
              Complete a task and then click
              Archive to move it here.
            </p>

          </div>

        ) : (

          <div className="archive-list">

            {archive.map((task) => (

              <div
                className="archive-item"
                key={task.archiveId}
              >

                <div className="archive-check">
                  ✓
                </div>

                <div className="archive-task-info">

                  <span className="archive-task-title">
                    {task.title}
                  </span>

                  <span className="archive-meta">
                    {task.originalColumn}
                    {" · "}
                    Completed{" "}
                    {new Date(
                      task.archivedAt
                    ).toLocaleDateString()}
                  </span>

                </div>

                <div className="archive-actions">

                  <button
                    onClick={() =>
                      restoreTask(
                        task.archiveId
                      )
                    }
                  >
                    Restore
                  </button>

                  <button
                    className="permanent-delete"
                    onClick={() =>
                      permanentlyDeleteArchiveItem(
                        task.archiveId
                      )
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </main>

    )}

  </div>
);
}

export default App;