import { useEffect, useState } from "react";
import "./App.css";
import Login from "./login";
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
  /*
   * --------------------------------
   * AUTHENTICATION
   * --------------------------------
   */

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setAuthLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setAuthLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /*
   * --------------------------------
   * LOAD WORKSPACE
   * --------------------------------
   */

  const loadWorkspace = async () => {
    setWorkspaceLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "Could not get current user:",
        userError
      );

      setWorkspaceLoading(false);
      return;
    }

    const [
      {
        data: goalsData,
        error: goalsError,
      },
      {
        data: columnsData,
        error: columnsError,
      },
      {
        data: tasksData,
        error: tasksError,
      },
      {
        data: archiveData,
        error: archiveError,
      },
    ] = await Promise.all([
      supabase
        .from("goals")
        .select("*")
        .order("position", {
          ascending: true,
        }),

      supabase
        .from("columns")
        .select("*")
        .order("position", {
          ascending: true,
        }),

      supabase
        .from("tasks")
        .select("*")
        .order("position", {
          ascending: true,
        }),

      supabase
        .from("archived_tasks")
        .select("*")
        .order("archived_at", {
          ascending: false,
        }),
    ]);

    if (goalsError) {
      console.error(
        "Error loading goals:",
        goalsError
      );
    }

    if (columnsError) {
      console.error(
        "Error loading columns:",
        columnsError
      );
    }

    if (tasksError) {
      console.error(
        "Error loading tasks:",
        tasksError
      );
    }

    if (archiveError) {
      console.error(
        "Error loading archived tasks:",
        archiveError
      );
    }

    /*
     * --------------------------------
     * STOP IF DATABASE READ FAILED
     * --------------------------------
     */

    if (
      goalsError ||
      columnsError ||
      tasksError ||
      archiveError
    ) {
      setWorkspaceLoading(false);
      return;
    }

    /*
     * --------------------------------
     * FIRST-TIME WORKSPACE SEED
     * --------------------------------
     */

    const workspaceIsEmpty =
      (goalsData || []).length === 0 &&
      (columnsData || []).length === 0 &&
      (tasksData || []).length === 0 &&
      (archiveData || []).length === 0;

    if (workspaceIsEmpty) {
      console.log(
        "No workspace found. Creating initial workspace..."
      );

      /*
       * CREATE GOALS
       */

      const {
        data: createdGoals,
        error: seedGoalsError,
      } = await supabase
        .from("goals")
        .insert(
          initialGoals.map(
            (goal, index) => ({
              title: goal.title,
              description:
                goal.description,
              position: index,
            })
          )
        )
        .select();

      if (seedGoalsError) {
        console.error(
          "Error creating initial goals:",
          seedGoalsError
        );

        setWorkspaceLoading(false);
        return;
      }

      /*
       * CREATE COLUMNS
       */

      const {
        data: createdColumns,
        error: seedColumnsError,
      } = await supabase
        .from("columns")
        .insert(
          initialColumns.map(
            (column, index) => ({
              title: column.title,
              position: index,
            })
          )
        )
        .select();

      if (seedColumnsError) {
        console.error(
          "Error creating initial columns:",
          seedColumnsError
        );

        setWorkspaceLoading(false);
        return;
      }

      /*
       * CREATE TASKS
       */

      const tasksToInsert = [];

      initialColumns.forEach(
        (column, columnIndex) => {
          const createdColumn =
            createdColumns[columnIndex];

          column.tasks.forEach(
            (task, taskIndex) => {
              tasksToInsert.push({
                column_id:
                  createdColumn.id,
                title: task.title,
                completed:
                  task.completed,
                position: taskIndex,
              });
            }
          );
        }
      );

      if (tasksToInsert.length > 0) {
        const {
          error: seedTasksError,
        } = await supabase
          .from("tasks")
          .insert(tasksToInsert);

        if (seedTasksError) {
          console.error(
            "Error creating initial tasks:",
            seedTasksError
          );

          setWorkspaceLoading(false);
          return;
        }
      }

      /*
       * Reload workspace using
       * real Supabase IDs.
       */

      await loadWorkspace();
      return;
    }

    /*
     * --------------------------------
     * REBUILD REACT STATE
     * --------------------------------
     */

    const rebuiltColumns =
      (columnsData || []).map(
        (column) => ({
          id: column.id,
          title: column.title,
          tasks: (tasksData || [])
            .filter(
              (task) =>
                task.column_id ===
                column.id
            )
            .map((task) => ({
              id: task.id,
              title: task.title,
              completed:
                task.completed,
            })),
        })
      );

    setGoals(
      (goalsData || []).map(
        (goal) => ({
          id: goal.id,
          title: goal.title,
          description:
            goal.description,
        })
      )
    );

    setColumns(rebuiltColumns);

    setArchive(
      (archiveData || []).map(
        (item) => ({
          archiveId: item.id,
          title: item.title,
          originalColumn:
            item.original_column,
          archivedAt:
            item.archived_at,
          completedAt:
            item.completed_at,
          columnId:
            item.column_id,
        })
      )
    );

    setWorkspaceLoading(false);
  };

  /*
   * --------------------------------
   * LOAD WORKSPACE WHEN LOGGED IN
   * --------------------------------
   */

  useEffect(() => {
    if (!session) {
      setWorkspaceLoading(false);
      return;
    }

    loadWorkspace();
  }, [session]);

  /*
   * --------------------------------
   * LOGOUT
   * --------------------------------
   */

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  /*
   * --------------------------------
   * APP STATE
   * --------------------------------
   */

  const [page, setPage] =
    useState("workspace");

  const [theme, setTheme] =
    useState("light");

  const [goals, setGoals] =
    useState(initialGoals);

  const [columns, setColumns] =
    useState(initialColumns);

  const [
    draggedColumnId,
    setDraggedColumnId,
  ] = useState(null);

  const [
    dragOverColumnId,
    setDragOverColumnId,
  ] = useState(null);

  const [archive, setArchive] =
    useState([]);

  const [newColumn, setNewColumn] =
    useState("");

  const [
    addingColumn,
    setAddingColumn,
  ] = useState(false);

  const [
    editingTask,
    setEditingTask,
  ] = useState(null);

  const [
    editingTaskText,
    setEditingTaskText,
  ] = useState("");

  /*
   * --------------------------------
   * LONG TERM GOALS
   * --------------------------------
   */

  async function addGoal() {
    const title = window.prompt(
      "What is your long-term goal?"
    );

    if (!title || !title.trim()) {
      return;
    }

    const cleanTitle = title.trim();

    const {
      data,
      error,
    } = await supabase
      .from("goals")
      .insert({
        title: cleanTitle,
        description: "",
        position: goals.length,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Error adding goal:",
        error
      );
      return;
    }

    setGoals((current) => [
      ...current,
      {
        id: data.id,
        title: data.title,
        description:
          data.description,
      },
    ]);
  }

  async function deleteGoal(goalId) {
    if (
      !window.confirm(
        "Delete this long-term goal?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", goalId);

    if (error) {
      console.error(
        "Error deleting goal:",
        error
      );
      return;
    }

    setGoals((current) =>
      current.filter(
        (goal) =>
          goal.id !== goalId
      )
    );
  }

  /*
   * EDIT GOAL TITLE
   */

  async function updateGoalTitle(
    goalId,
    newTitle
  ) {
    const cleanTitle =
      newTitle.trim();

    if (!cleanTitle) {
      return;
    }

    const { error } = await supabase
      .from("goals")
      .update({
        title: cleanTitle,
      })
      .eq("id", goalId);

    if (error) {
      console.error(
        "Error updating goal title:",
        error
      );
      return;
    }

    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              title: cleanTitle,
            }
          : goal
      )
    );
  }

  /*
   * EDIT GOAL DESCRIPTION
   */

  async function updateGoalDescription(
    goalId,
    newDescription
  ) {
    const { error } =
      await supabase
        .from("goals")
        .update({
          description:
            newDescription,
        })
        .eq("id", goalId);

    if (error) {
      console.error(
        "Error updating goal description:",
        error
      );
      return;
    }

    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              description:
                newDescription,
            }
          : goal
      )
    );
  }

  /*
   * --------------------------------
   * COLUMNS
   * --------------------------------
   */

  async function addColumn() {
    const title =
      newColumn.trim();

    if (!title) {
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("columns")
      .insert({
        title,
        position: columns.length,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Error adding column:",
        error
      );
      return;
    }

    setColumns((current) => [
      ...current,
      {
        id: data.id,
        title: data.title,
        tasks: [],
      },
    ]);

    setNewColumn("");
    setAddingColumn(false);
  }

  async function deleteColumn(
    columnId
  ) {
    if (
      !window.confirm(
        "Delete this column and all of its active tasks?"
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("columns")
        .delete()
        .eq("id", columnId);

    if (error) {
      console.error(
        "Error deleting column:",
        error
      );
      return;
    }

    setColumns((current) =>
      current.filter(
        (column) =>
          column.id !== columnId
      )
    );
  }

  /*
   * --------------------------------
   * INLINE COLUMN RENAMING
   * --------------------------------
   */

  async function renameColumn(
    columnId,
    newTitle
  ) {
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

    const { error } =
      await supabase
        .from("columns")
        .update({
          title: newTitle,
        })
        .eq("id", columnId);

    if (error) {
      console.error(
        "Error renaming column:",
        error
      );
    }
  }

  /*
   * --------------------------------
   * MOVE COLUMNS
   * --------------------------------
   */

  const handleColumnDragStart = (
    event,
    columnId
  ) => {
    setDraggedColumnId(columnId);

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      columnId
    );
  };

  const handleColumnDragOver = (
    event,
    columnId
  ) => {
    event.preventDefault();

    event.dataTransfer.dropEffect =
      "move";

    if (
      columnId !==
      draggedColumnId
    ) {
      setDragOverColumnId(
        columnId
      );
    }
  };

  const handleColumnDrop = async (
    event,
    targetColumnId
  ) => {
    event.preventDefault();

    if (
      !draggedColumnId ||
      draggedColumnId ===
        targetColumnId
    ) {
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      return;
    }

    const draggedColumn =
      columns.find(
        (column) =>
          column.id ===
          draggedColumnId
      );

    if (!draggedColumn) {
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      return;
    }

    const remainingColumns =
      columns.filter(
        (column) =>
          column.id !==
          draggedColumnId
      );

    const targetIndex =
      remainingColumns.findIndex(
        (column) =>
          column.id ===
          targetColumnId
      );

    if (targetIndex === -1) {
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      return;
    }

    remainingColumns.splice(
      targetIndex,
      0,
      draggedColumn
    );

    /*
     * Save new order.
     */

    const updates =
      remainingColumns.map(
        (column, index) =>
          supabase
            .from("columns")
            .update({
              position: index,
            })
            .eq("id", column.id)
      );

    const results =
      await Promise.all(
        updates
      );

    const failed = results.find(
      (result) => result.error
    );

    if (failed) {
      console.error(
        "Error saving column order:",
        failed.error
      );

      setDraggedColumnId(null);
      setDragOverColumnId(null);
      return;
    }

    setColumns(
      remainingColumns
    );

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

  async function addTask(
    columnId
  ) {
    const title = window.prompt(
      "What task do you want to add?"
    );

    if (!title || !title.trim()) {
      return;
    }

    const cleanTitle =
      title.trim();

    const column = columns.find(
      (column) =>
        column.id === columnId
    );

    if (!column) {
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("tasks")
      .insert({
        column_id: columnId,
        title: cleanTitle,
        completed: false,
        position:
          column.tasks.length,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Error adding task:",
        error
      );
      return;
    }

    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? {
              ...column,
              tasks: [
                ...column.tasks,
                {
                  id: data.id,
                  title: data.title,
                  completed:
                    data.completed,
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
   */

  async function toggleTask(
    columnId,
    taskId
  ) {
    const column = columns.find(
      (column) =>
        column.id === columnId
    );

    if (!column) {
      return;
    }

    const task = column.tasks.find(
      (task) =>
        task.id === taskId
    );

    if (!task) {
      return;
    }

    const newCompleted =
      !task.completed;

    const {
      error,
    } = await supabase
      .from("tasks")
      .update({
        completed:
          newCompleted,
        completed_at:
          newCompleted
            ? new Date().toISOString()
            : null,
      })
      .eq("id", taskId);

    if (error) {
      console.error(
        "Error updating task:",
        error
      );
      return;
    }

    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? {
              ...column,
              tasks:
                column.tasks.map(
                  (task) =>
                    task.id ===
                    taskId
                      ? {
                          ...task,
                          completed:
                            newCompleted,
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

  function startEditingTask(
    task
  ) {
    setEditingTask(task.id);
    setEditingTaskText(
      task.title
    );
  }

  async function saveTaskEdit(
    columnId,
    taskId
  ) {
    const newTitle =
      editingTaskText.trim();

    if (!newTitle) {
      cancelTaskEdit();
      return;
    }

    const {
      error,
    } = await supabase
      .from("tasks")
      .update({
        title: newTitle,
      })
      .eq("id", taskId);

    if (error) {
      console.error(
        "Error updating task title:",
        error
      );
      return;
    }

    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? {
              ...column,
              tasks:
                column.tasks.map(
                  (task) =>
                    task.id ===
                    taskId
                      ? {
                          ...task,
                          title:
                            newTitle,
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
   */

  async function archiveTask(
    columnId,
    taskId
  ) {
    const column = columns.find(
      (column) =>
        column.id === columnId
    );

    if (!column) {
      return;
    }

    const task = column.tasks.find(
      (task) =>
        task.id === taskId
    );

    if (
      !task ||
      !task.completed
    ) {
      return;
    }

    const now =
      new Date().toISOString();

    const {
      data: archivedData,
      error: archiveError,
    } = await supabase
      .from("archived_tasks")
      .insert({
        column_id: columnId,
        title: task.title,
        original_column:
          column.title,
        completed_at: now,
        archived_at: now,
      })
      .select()
      .single();

    if (archiveError) {
      console.error(
        "Error archiving task:",
        archiveError
      );
      return;
    }

    const {
      error: deleteError,
    } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (deleteError) {
      console.error(
        "Error removing archived task from active tasks:",
        deleteError
      );
      return;
    }

    setArchive((current) => [
      {
        archiveId:
          archivedData.id,
        title:
          archivedData.title,
        originalColumn:
          archivedData.original_column,
        archivedAt:
          archivedData.archived_at,
        completedAt:
          archivedData.completed_at,
        columnId:
          archivedData.column_id,
      },
      ...current,
    ]);

    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? {
              ...column,
              tasks:
                column.tasks.filter(
                  (task) =>
                    task.id !==
                    taskId
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

  async function deleteTask(
    columnId,
    taskId
  ) {
    const {
      error,
    } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      console.error(
        "Error deleting task:",
        error
      );
      return;
    }

    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? {
              ...column,
              tasks:
                column.tasks.filter(
                  (task) =>
                    task.id !==
                    taskId
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

  async function restoreTask(
    archiveId
  ) {
    const task = archive.find(
      (item) =>
        item.archiveId ===
        archiveId
    );

    if (!task) {
      return;
    }

    let targetColumn =
      columns.find(
        (column) =>
          column.id ===
          task.columnId
      );

    /*
     * If original column was deleted,
     * try to find one with same name.
     */

    if (!targetColumn) {
      targetColumn =
        columns.find(
          (column) =>
            column.title ===
            task.originalColumn
        );
    }

    /*
     * If original column no longer
     * exists, recreate it.
     */

    if (!targetColumn) {
      const {
        data: newColumn,
        error: columnError,
      } = await supabase
        .from("columns")
        .insert({
          title:
            task.originalColumn,
          position:
            columns.length,
        })
        .select()
        .single();

      if (columnError) {
        console.error(
          "Error recreating column:",
          columnError
        );
        return;
      }

      targetColumn = {
        id: newColumn.id,
        title:
          newColumn.title,
        tasks: [],
      };
    }

    /*
     * Create active task again.
     */

    const {
      data: restoredTask,
      error: taskError,
    } = await supabase
      .from("tasks")
      .insert({
        column_id:
          targetColumn.id,
        title: task.title,
        completed: false,
        position:
          targetColumn.tasks.length,
      })
      .select()
      .single();

    if (taskError) {
      console.error(
        "Error restoring task:",
        taskError
      );
      return;
    }

    /*
     * Remove task from archive.
     */

    const {
      error: archiveDeleteError,
    } = await supabase
      .from("archived_tasks")
      .delete()
      .eq("id", archiveId);

    if (archiveDeleteError) {
      console.error(
        "Error removing task from archive:",
        archiveDeleteError
      );
      return;
    }

    /*
     * Update React state.
     */

    const columnAlreadyExists =
      columns.some(
        (column) =>
          column.id ===
          targetColumn.id
      );

    if (!columnAlreadyExists) {
      setColumns((current) => [
        ...current,
        {
          id: targetColumn.id,
          title:
            targetColumn.title,
          tasks: [
            {
              id: restoredTask.id,
              title:
                restoredTask.title,
              completed: false,
            },
          ],
        },
      ]);
    } else {
      setColumns((current) =>
        current.map((column) =>
          column.id ===
          targetColumn.id
            ? {
                ...column,
                tasks: [
                  ...column.tasks,
                  {
                    id:
                      restoredTask.id,
                    title:
                      restoredTask.title,
                    completed: false,
                  },
                ],
              }
            : column
        )
      );
    }

    setArchive((current) =>
      current.filter(
        (item) =>
          item.archiveId !==
          archiveId
      )
    );
  }

  async function permanentlyDeleteArchiveItem(
    archiveId
  ) {
    const {
      error,
    } = await supabase
      .from("archived_tasks")
      .delete()
      .eq("id", archiveId);

    if (error) {
      console.error(
        "Error permanently deleting archived task:",
        error
      );
      return;
    }

    setArchive((current) =>
      current.filter(
        (item) =>
          item.archiveId !==
          archiveId
      )
    );
  }

  /*
   * --------------------------------
   * PROGRESS
   * --------------------------------
   */

  const activeTasks =
    columns.reduce(
      (total, column) =>
        total +
        column.tasks.filter(
          (task) =>
            !task.completed
        ).length,
      0
    );

  const completedTasks =
    columns.reduce(
      (total, column) =>
        total +
        column.tasks.filter(
          (task) =>
            task.completed
        ).length,
      0
    ) + archive.length;

  const totalTasks =
    activeTasks + completedTasks;

  const overallProgress =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedTasks /
            totalTasks) *
            100
        );

  /*
   * --------------------------------
   * AUTH PROTECTION
   * --------------------------------
   */

  if (authLoading) {
    return (
      <div className="auth-loading">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (workspaceLoading) {
    return (
      <div className="auth-loading">
        Loading workspace...
      </div>
    );
  }

  /*
   * --------------------------------
   * RENDER
   * --------------------------------
   */

  return (
    <div
      className={`app ${theme}`}
    >
      {/* HEADER */}

      <header className="header">
        <div className="brand">
          <h1>Project OS</h1>

          <button
            onClick={handleLogout}
          >
            Log out
          </button>

          <p>
            Long-term goals →
            current focus → action
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
              onClick={() =>
                setPage("workspace")
              }
            >
              Workspace
            </button>

            <button
              className={
                page === "archive"
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() =>
                setPage("archive")
              }
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
            {theme === "light"
              ? "☾"
              : "☀"}
          </button>

          <div className="overall-progress">
            <span>
              Overall
            </span>

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
                        deleteGoal(
                          goal.id
                        )
                      }
                    >
                      ×
                    </button>
                  </div>

                  {/* EDITABLE GOAL TITLE */}

                  <input
                    className="goal-title-input"
                    value={goal.title}
                    onChange={(event) =>
                      setGoals(
                        (current) =>
                          current.map(
                            (item) =>
                              item.id ===
                              goal.id
                                ? {
                                    ...item,
                                    title:
                                      event
                                        .target
                                        .value,
                                  }
                                : item
                          )
                      )
                    }
                    onBlur={(event) =>
                      updateGoalTitle(
                        goal.id,
                        event.target
                          .value
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        event.currentTarget.blur();
                      }

                      if (
                        event.key ===
                        "Escape"
                      ) {
                        event.currentTarget.blur();
                      }
                    }}
                    aria-label="Goal title"
                  />

                  {/* EDITABLE GOAL DESCRIPTION */}

                 <textarea
  className="goal-description-input"
  value={goal.description}
  placeholder="Add a description for this goal."
  onChange={(event) => {
    setGoals((current) =>
      current.map((item) =>
        item.id === goal.id
          ? {
              ...item,
              description:
                event.target.value,
            }
          : item
      )
    );

    event.target.style.height = "auto";
    event.target.style.height =
      `${event.target.scrollHeight}px`;
  }}
  onBlur={(event) =>
    updateGoalDescription(
      goal.id,
      event.target.value
    )
  }
  aria-label="Goal description"
/>
                </div>
              ))}

              {goals.length === 0 && (
                <button
                  className="empty-goal"
                  onClick={addGoal}
                >
                  + Add your first
                  long-term goal
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
                    setAddingColumn(
                      true
                    )
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
                      event.target
                        .value
                    )
                  }
                  placeholder="Column name..."
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      addColumn();
                    }

                    if (
                      event.key ===
                      "Escape"
                    ) {
                      setAddingColumn(
                        false
                      );
                      setNewColumn("");
                    }
                  }}
                />

                <button
                  onClick={addColumn}
                >
                  Add
                </button>

                <button
                  className="cancel-button"
                  onClick={() => {
                    setAddingColumn(
                      false
                    );
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
                    draggedColumnId ===
                    column.id
                      ? "dragging"
                      : ""
                  } ${
                    dragOverColumnId ===
                    column.id
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
                      onDragStart={(
                        event
                      ) =>
                        handleColumnDragStart(
                          event,
                          column.id
                        )
                      }
                      onDragEnd={
                        handleColumnDragEnd
                      }
                      title="Drag to move column"
                      aria-label="Drag to move column"
                    >
                      ⋮⋮
                    </div>

                    <div className="column-title-wrapper">
                      <input
                        className="column-title"
                        value={
                          column.title
                        }
                        onChange={(
                          event
                        ) =>
                          renameColumn(
                            column.id,
                            event.target
                              .value
                          )
                        }
                      />

                      <span>
                        {
                          column.tasks.filter(
                            (task) =>
                              !task.completed
                          ).length
                        }{" "}
                        active
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
                    {column.tasks.map(
                      (task) => (
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
                            {task.completed
                              ? "✓"
                              : ""}
                          </button>

                          {/* TASK TITLE */}

                          {editingTask ===
                          task.id ? (
                            <input
                              autoFocus
                              className="task-title-input"
                              value={
                                editingTaskText
                              }
                              onChange={(
                                event
                              ) =>
                                setEditingTaskText(
                                  event
                                    .target
                                    .value
                                )
                              }
                              onBlur={() =>
                                saveTaskEdit(
                                  column.id,
                                  task.id
                                )
                              }
                              onKeyDown={(
                                event
                              ) => {
                                if (
                                  event.key ===
                                  "Enter"
                                ) {
                                  saveTaskEdit(
                                    column.id,
                                    task.id
                                  );
                                }

                                if (
                                  event.key ===
                                  "Escape"
                                ) {
                                  cancelTaskEdit();
                                }
                              }}
                            />
                          ) : (
                            <span
                              className="task-title"
                              onClick={() =>
                                startEditingTask(
                                  task
                                )
                              }
                              title="Click to edit"
                            >
                              {
                                task.title
                              }
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
                      )
                    )}

                    {column.tasks.length ===
                      0 && (
                      <div className="empty-tasks">
                        No tasks
                      </div>
                    )}
                  </div>

                  {/* ADD TASK */}

                  <button
                    className="add-task"
                    onClick={() =>
                      addTask(
                        column.id
                      )
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
                Completed tasks that you
                have chosen to archive.
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
                Complete a task and then
                click Archive to move it
                here.
              </p>
            </div>
          ) : (
            <div className="archive-list">
              {archive.map((task) => (
                <div
                  className="archive-item"
                  key={
                    task.archiveId
                  }
                >
                  <div className="archive-check">
                    ✓
                  </div>

                  <div className="archive-task-info">
                    <span className="archive-task-title">
                      {task.title}
                    </span>

                    <span className="archive-meta">
                      {
                        task.originalColumn
                      }
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