// Fetch tasks for the selected user and week
function fetchTasks(userId) {
    const weekInput = document.getElementById("week-select").value;
    const [year, week] = weekInput ? weekInput.split('-W') : getCurrentYearWeek();

    const { startOfWeek, endOfWeek } = getWeekRange(parseInt(year), parseInt(week));

    fetch(`http://localhost:8080/tasker/list/${userId}`)
        .then(response => response.json())
        .then(tasks => {
            console.log("Fetched tasks:", tasks);

            // Filter tasks based on the selected week
            const filteredTasks = tasks.filter(task => {
                const taskDate = new Date(task.dueDate);
                return taskDate >= startOfWeek && taskDate <= endOfWeek;
            });

            renderTasksAsBubbles(filteredTasks, startOfWeek, endOfWeek);
        })
        .catch(error => {
            console.error("Error fetching tasks:", error);
        });
}

// Function to get the current year and week
function getCurrentYearWeek() {
    const today = new Date();
    return [today.getFullYear(), getWeekNumber(today)];
}

// Function to get the week number of a date
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Function to get the start and end date of a given year and week number
function getWeekRange(year, week) {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysToMonday = (firstDayOfYear.getDay() === 0 ? 6 : firstDayOfYear.getDay() - 1); // Adjust for Monday as start
    const startOfWeek = new Date(year, 0, 1 + (week - 1) * 7 - daysToMonday);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return { startOfWeek, endOfWeek };
}

// Handle week selection change
document.getElementById("week-select").addEventListener("change", function() {
    const userId = document.getElementById("user-select").value;
    fetchTasks(userId);
});

// Fetch users and populate the dropdown
function fetchUsers() {
    fetch('http://localhost:8080/tasker/user/list')
        .then(response => response.json())
        .then(users => {
            const userSelect = document.getElementById('user-select');
            userSelect.innerHTML = '';

            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.firstName + ' ' + user.lastName;
                userSelect.appendChild(option);
            });

            // Set default week to the current week
            const weekInput = document.getElementById("week-select");
            const [currentYear, currentWeek] = getCurrentYearWeek();
            weekInput.value = `${currentYear}-W${String(currentWeek).padStart(2, '0')}`;

            if (users.length > 0) {
                fetchTasks(users[0].id);
            }
        })
        .catch(error => {
            console.error("Error fetching users:", error);
        });
}

// Render tasks as bubbles in the graph
function renderTasksAsBubbles(tasks, startOfWeek, endOfWeek) {
    const svg = d3.select("svg");
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;

    const priorityScale = { HIGH: 50, MEDIUM: 35, LOW: 20 };

    tasks.forEach(task => {
        task.dueDate = new Date(task.dueDate);
    });

    tasks.sort((a, b) => a.dueDate - b.dueDate);

    const xScale = d3.scaleTime()
        .domain([startOfWeek, endOfWeek])
        .range([50, width - 50]);

    const yScale = d3.scaleTime()
        .domain([new Date(0, 0, 0, 0, 0), new Date(0, 0, 0, 24, 0)])
        .range([50, height - 50]);

    const xAxis = d3.axisBottom(xScale)
        .ticks(d3.timeDay.every(1))
        .tickFormat(d3.timeFormat("%a %d"));

    const yAxis = d3.axisLeft(yScale)
        .ticks(d3.timeHour.every(2))
        .tickFormat(d3.timeFormat("%H:%M"))
        .tickSize(10);

    svg.selectAll("*").remove();

    svg.append("g")
        .attr("transform", `translate(0, ${height - 50})`)
        .call(xAxis);

    svg.append("g")
        .attr("transform", "translate(50, 0)")
        .call(yAxis);

    const bubbles = svg.selectAll("circle")
        .data(tasks)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.dueDate))
        .attr("cy", d => yScale(new Date(0, 0, 0, d.dueDate.getHours(), d.dueDate.getMinutes())))
        .attr("r", 0)
        .attr("fill", d => d.priority === "HIGH" ? "red" : d.priority === "LOW" ? "green" : "yellow")
        .attr("opacity", 0.7);

    bubbles.append("title")
        .text(d => `${d.title} - Due: ${d.dueDate.toLocaleDateString()}`);

    bubbles.transition()
        .duration(1000)
        .attr("r", d => priorityScale[d.priority] || 30);

    svg.selectAll("text.task-title")
        .data(tasks)
        .enter()
        .append("text")
        .attr("x", d => xScale(d.dueDate))
        .attr("y", d => yScale(new Date(0, 0, 0, d.dueDate.getHours(), d.dueDate.getMinutes())) + (priorityScale[d.priority] || 30) + 15)
        .attr("text-anchor", "middle")
        .text(d => d.title)
        .style("font-size", "12px")
        .style("fill", "black")
        .style("opacity", 0);

    bubbles.on("click", function(event, d) {
        const detailsBox = document.getElementById("task-details-box");
        document.getElementById("details-title").textContent = d.title;
        document.getElementById("details-description").textContent = `Description: ${d.description}`;
        document.getElementById("details-dueDate").textContent = `Due Date: ${new Date(d.dueDate).toLocaleString()}`; // Format for display
        document.getElementById("details-priority").textContent = `Priority: ${d.priority}`;
        document.getElementById("details-completed").textContent = `Completed: ${d.completed ? "Yes" : "No"}`;

        const bubble = d3.select(this);
        const bubbleX = parseFloat(bubble.attr("cx"));
        const bubbleY = parseFloat(bubble.attr("cy"));

        detailsBox.style.display = "block";
        detailsBox.style.left = `${bubbleX + 50}px`;
        detailsBox.style.top = `${bubbleY + 50}px`;
        detailsBox.style.opacity = 0;
        detailsBox.style.transition = "opacity 0.5s";
        setTimeout(() => {
            detailsBox.style.opacity = 1;
        }, 0);

        // Store task data in details box for later use
        detailsBox.dataset.taskId = d.id;
        detailsBox.dataset.taskTitle = d.title;
        detailsBox.dataset.taskDescription = d.description;
        detailsBox.dataset.taskDueDate = new Date(d.dueDate).toISOString().slice(0, 16); // Format for datetime-local input
        detailsBox.dataset.taskPriority = d.priority;
        detailsBox.dataset.taskCompleted = d.completed;
    });

    // Event delegation for close and update buttons
    document.getElementById("task-details-box").addEventListener("click", (event) => {
        const detailsBox = document.getElementById("task-details-box");

        if (event.target.id === "close-details-btn") {
            detailsBox.style.opacity = 0;
            setTimeout(() => {
                detailsBox.style.display = "none";
                // Restore the original content of the details box
                detailsBox.innerHTML = `
                    <button id="close-details-btn" style="float: right;">X</button>
                    <h3 id="details-title"></h3>
                    <p id="details-description"></p>
                    <p id="details-dueDate"></p>
                    <p id="details-priority"></p>
                    <p id="details-completed"></p>
                    <button id="update-task-btn">Update</button>
                `;
            }, 500);
        }

        if (event.target.id === "update-task-btn") {
            const taskId = detailsBox.dataset.taskId;

            // Transform details into editable fields
            detailsBox.innerHTML = `
                <button id="close-details-btn" style="float: right;">X</button>
                <h3><input type="text" id="edit-title" value="${detailsBox.dataset.taskTitle}"></h3>
                <p>Description: <textarea id="edit-description">${detailsBox.dataset.taskDescription}</textarea></p>
                <p>Due Date: <input type="datetime-local" id="edit-dueDate" value="${detailsBox.dataset.taskDueDate}"></p>
                <p>Priority: 
                    <select id="edit-priority">
                        <option value="HIGH" ${detailsBox.dataset.taskPriority === "HIGH" ? "selected" : ""}>High</option>
                        <option value="MEDIUM" ${detailsBox.dataset.taskPriority === "MEDIUM" ? "selected" : ""}>Medium</option>
                        <option value="LOW" ${detailsBox.dataset.taskPriority === "LOW" ? "selected" : ""}>Low</option>
                    </select>
                </p>
                <p>Completed: <input type="checkbox" id="edit-completed" ${detailsBox.dataset.taskCompleted === "true" ? "checked" : ""}></p>
                <button id="save-task-btn">Save</button>
            `;

            // Re-add close button event listener
            document.getElementById("close-details-btn").addEventListener("click", () => {
                detailsBox.style.opacity = 0;
                setTimeout(() => {
                    detailsBox.style.display = "none";
                }, 500);
            });

            // Add save button event listener
            document.getElementById("save-task-btn").addEventListener("click", () => {
                const updatedTask = {
                    id: taskId,
                    title: document.getElementById("edit-title").value,
                    description: document.getElementById("edit-description").value,
                    dueDate: new Date(document.getElementById("edit-dueDate").value).toISOString(), // Ensure correct format
                    priority: document.getElementById("edit-priority").value,
                    completed: document.getElementById("edit-completed").checked
                };

                fetch(`http://localhost:8080/tasker/${taskId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedTask)
                })
                .then(response => response.json())
                .then(data => {
                    console.log("Task updated:", data);
                    detailsBox.style.opacity = 0;
                    setTimeout(() => {
                        detailsBox.style.display = "none";
                        // Restore the original content of the details box
                        detailsBox.innerHTML = `
                            <button id="close-details-btn" style="float: right;">X</button>
                            <h3 id="details-title"></h3>
                            <p id="details-description"></p>
                            <p id="details-dueDate"></p>
                            <p id="details-priority"></p>
                            <p id="details-completed"></p>
                            <button id="update-task-btn">Update</button>
                        `;
                    }, 500);
                    // Optionally, refresh the task list or update the UI
                    const userId = document.getElementById("user-select").value;
                    fetchTasks(userId);
                })
                .catch(error => {
                    console.error("Error updating task:", error);
                });
            });
        }
    });
}

// Handle user selection change
document.getElementById('user-select').addEventListener('change', function(event) {
    fetchTasks(event.target.value);
});

// Show the task form container when the "new-task-btn" button is clicked
document.getElementById("new-task-btn").addEventListener("click", () => {
    document.getElementById("task-form-container").style.display = "block";
});

// Hide the task form container when the "cancel-btn" button is clicked
document.getElementById("cancel-btn").addEventListener("click", () => {
    document.getElementById("task-form-container").style.display = "none";
});

// Handle form submission to create a new task
document.getElementById("task-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const userId = document.getElementById("user-select").value;

    const newTask = {
        title: document.getElementById("task-title").value,
        description: document.getElementById("task-description").value,
        dueDate: new Date(document.getElementById("task-dueDate").value).toISOString(), // Ensure correct format
        priority: document.getElementById("task-priority").value,
        completed: document.getElementById("task-completed").checked,
        userId: userId  // Include the selected user's ID
    };

    fetch('http://localhost:8080/tasker', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTask)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Task created:", data);
        document.getElementById("task-form-container").style.display = "none";
        // Optionally, refresh the task list or update the UI
        fetchTasks(userId);
    })
    .catch(error => {
        console.error("Error creating task:", error);
    });
});

// Initial fetch of users and tasks
fetchUsers();
