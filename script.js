// Fetch tasks for the selected user
function fetchTasks(userId) {
    fetch(`http://localhost:8080/tasker/list/${userId}`)
        .then(response => response.json())
        .then(tasks => {
            console.log("Fetched tasks:", tasks);
            renderTasksAsBubbles(tasks);
        })
        .catch(error => {
            console.error("Error fetching tasks:", error);
        });
}

// Fetch users and populate the dropdown
function fetchUsers() {
    fetch('http://localhost:8080/tasker/user/list')
        .then(response => response.json())
        .then(users => {
            const userSelect = document.getElementById('user-select');
            userSelect.innerHTML = ''; // Clear existing options
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.firstName + ' ' + user.lastName;
                userSelect.appendChild(option);
            });
            // Fetch tasks for the first user by default
            if (users.length > 0) {
                fetchTasks(users[0].id);
            }
        })
        .catch(error => {
            console.error("Error fetching users:", error);
        });
}

// Render tasks as bubbles in the graph
function renderTasksAsBubbles(tasks) {
    const svg = d3.select("svg");
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;

    // Set up bubble size mapping for priority
    const priorityScale = { HIGH: 50, MEDIUM: 35, LOW: 20 };

    // Convert dueDate string to Date object
    tasks.forEach(task => {
        task.dueDate = new Date(task.dueDate);
    });

    // Sort tasks based on dueDate
    tasks.sort((a, b) => a.dueDate - b.dueDate);

    // Get the earliest and latest task dates
    const earliestDate = d3.min(tasks, task => task.dueDate);
    const latestDate = d3.max(tasks, task => task.dueDate);

    // Create x-axis scale (time) with 1 day padding before and after the tasks' range
    const xScale = d3.scaleTime()
        .domain([d3.timeDay.offset(earliestDate, -1), d3.timeDay.offset(latestDate, 1)])  // Adjust by 1 day before and after
        .range([50, width - 50]);

    // Create y-axis scale for 24-hour day with 2-hour intervals
    const yScale = d3.scaleTime()
        .domain([new Date(0, 0, 0, 0, 0), new Date(0, 0, 0, 24, 0)])  // Midnight to midnight
        .range([50, height - 50]);

    // Create x-axis
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat("%b %d"))  // Format the dates as "March 10"
        .tickSize(10);

    // Create y-axis for 24-hour day with 2-hour intervals
    const yAxis = d3.axisLeft(yScale)
        .ticks(d3.timeHour.every(2))  // 2-hour intervals
        .tickFormat(d3.timeFormat("%H:%M"))  // Format the times as "00:00", "02:00"
        .tickSize(10);

    // Clear existing content before appending new elements
    svg.selectAll("*").remove();

    // Append x-axis to SVG and style the font size of labels
    svg.append("g")
        .attr("transform", `translate(0, ${height - 50})`)  // Position it at the bottom
        .call(xAxis)
        .selectAll("text")
        .style("font-size", "14px")
        .style("fill", "gray")  // Gray color for text
        .style("font-weight", "bold");  // Thicker font for visibility

    // Append y-axis to SVG and style the font size of labels (left side)
    svg.append("g")
        .attr("transform", "translate(50, 0)")  // Position it on the left side
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "14px")
        .style("fill", "gray")  // Gray color for text
        .style("font-weight", "bold");  // Thicker font for visibility

    // Bind data to circles (bubbles)
    const bubbles = svg.selectAll("circle")
        .data(tasks)
        .enter()
        .append("circle")
        .attr("cx", function(d) {
            return xScale(d.dueDate);
        })
        .attr("cy", function(d) {
            const timeOfDay = new Date(0, 0, 0, d.dueDate.getHours(), d.dueDate.getMinutes());
            return yScale(timeOfDay);
        })
        .attr("r", function(d) {
            return priorityScale[d.priority] || 30;
        })
        .attr("fill", function(d) {
            if (d.priority === "HIGH") return "red";  // Red for high priority
            if (d.priority === "LOW") return "green"; // Green for low priority
            return "yellow";  // Yellow for medium priority
        })
        .attr("opacity", 0.7)
        .on("click", function(event, d) {
            // Show task details box
            const detailsBox = document.getElementById("task-details-box");
            const bubble = d3.select(this);
            const x = parseFloat(bubble.attr("cx"));
            const y = parseFloat(bubble.attr("cy"));

            // Update task details content
            document.getElementById("details-title").innerText = `Title: ${d.title}`;
            document.getElementById("details-description").innerText = `Description: ${d.description}`;
            document.getElementById("details-dueDate").innerText = `Due Date: ${d.dueDate.toLocaleDateString()}`;
            document.getElementById("details-priority").innerText = `Priority: ${d.priority}`;
            document.getElementById("details-completed").innerText = `Completed: ${d.completed ? "Yes" : "No"}`;

            // Position and show the details box
            detailsBox.style.left = `${x + 10}px`;
            detailsBox.style.top = `${y + 10}px`;
            detailsBox.style.display = "block";
        });

    // Add tooltips
    bubbles.append("title")
        .text(function(d) {
            return `${d.title} - Due: ${d.dueDate.toLocaleDateString()}`;
        });

    // Add labels for task titles
    svg.selectAll("text.task-title")
        .data(tasks)
        .enter()
        .append("text")
        .attr("x", function(d) { return xScale(d.dueDate); })
        .attr("y", function(d) {
            const timeOfDay = new Date(0, 0, 0, d.dueDate.getHours(), d.dueDate.getMinutes());
            const radius = priorityScale[d.priority] || 30;
            return yScale(timeOfDay) + radius + 15;  // Position labels below bubbles
        })
        .attr("text-anchor", "middle")
        .text(function(d) { return d.title; })
        .style("font-size", "12px")
        .style("fill", "black");
}

// Handle user selection change
document.getElementById('user-select').addEventListener('change', function(event) {
    const userId = event.target.value;
    fetchTasks(userId);
});

// Initial fetch of users and tasks
fetchUsers();

document.getElementById("new-task-btn").addEventListener("click", () => {
    const formContainer = document.getElementById("task-form-container");
    formContainer.style.display = "block";
});

// Function to handle the task form submission
document.getElementById("task-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    // Collect data from the form
    const title = document.getElementById("task-title").value;
    const description = document.getElementById("task-description").value;
    const dueDate = document.getElementById("task-dueDate").value;
    const priority = document.getElementById("task-priority").value;
    const completed = document.getElementById("task-completed").checked;

    // Prepare the task data
    const userId = document.getElementById('user-select').value;
    const newTask = {
        title,
        description,
        dueDate,
        priority,
        completed,
        userId
    };

    try {
        const response = await fetch("http://localhost:8080/tasker", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newTask)
        });

        if (response.ok) {
            alert("Task created successfully!");
            document.getElementById("task-form-container").style.display = "none";
            fetchTasks(userId); // Refresh the task list for the selected user
        } else {
            alert("Failed to create task");
        }
    } catch (error) {
        console.error("Error creating task:", error);
        alert("Error creating task");
    }
});

// Handle cancel button click
document.getElementById("cancel-btn").addEventListener("click", () => {
    document.getElementById("task-form-container").style.display = "none";
});

// Handle close details button click
document.getElementById("close-details-btn").addEventListener("click", () => {
    document.getElementById("task-details-box").style.display = "none";
});