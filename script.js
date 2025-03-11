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

    const priorityScale = { HIGH: 50, MEDIUM: 35, LOW: 20 };

    tasks.forEach(task => {
        task.dueDate = new Date(task.dueDate);
    });

    tasks.sort((a, b) => a.dueDate - b.dueDate);

    const earliestDate = d3.min(tasks, task => task.dueDate);
    const latestDate = d3.max(tasks, task => task.dueDate);

    const xScale = d3.scaleTime()
        .domain([d3.timeDay.offset(earliestDate, -1), d3.timeDay.offset(latestDate, 1)])
        .range([50, width - 50]);

    const yScale = d3.scaleTime()
        .domain([new Date(0, 0, 0, 0, 0), new Date(0, 0, 0, 24, 0)])
        .range([50, height - 50]);

    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat("%b %d"))
        .tickSize(10);

    const yAxis = d3.axisLeft(yScale)
        .ticks(d3.timeHour.every(2))
        .tickFormat(d3.timeFormat("%H:%M"))
        .tickSize(10);

    svg.selectAll("*").remove();

    svg.append("g")
        .attr("transform", `translate(0, ${height - 50})`)
        .call(xAxis)
        .selectAll("text")
        .style("font-size", "14px")
        .style("fill", "gray")
        .style("font-weight", "bold")
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .style("opacity", 1);

    svg.append("g")
        .attr("transform", "translate(50, 0)")
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "14px")
        .style("fill", "gray")
        .style("font-weight", "bold")
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .style("opacity", 1);

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
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .style("opacity", 1);

    bubbles.on("click", function(event, d) {
        const detailsBox = document.getElementById("task-details-box");
        document.getElementById("details-title").textContent = d.title;
        document.getElementById("details-description").textContent = `Description: ${d.description}`;
        document.getElementById("details-dueDate").textContent = `Due Date: ${d.dueDate.toLocaleString()}`;
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
    });

    document.getElementById("close-details-btn").addEventListener("click", () => {
        const detailsBox = document.getElementById("task-details-box");
        detailsBox.style.opacity = 0;
        setTimeout(() => {
            detailsBox.style.display = "none";
        }, 500);
    });
}

// Handle user selection change
document.getElementById('user-select').addEventListener('change', function(event) {
    const userId = event.target.value;
    fetchTasks(userId);
});

// Initial fetch of users and tasks
fetchUsers();

document.getElementById("new-task-btn").addEventListener("click", () => {
    document.getElementById("task-form-container").style.display = "block";
});

// Handle task form submission
document.getElementById("task-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("task-title").value;
    const description = document.getElementById("task-description").value;
    const dueDate = document.getElementById("task-dueDate").value;
    const priority = document.getElementById("task-priority").value;
    const completed = document.getElementById("task-completed").checked;
    const userId = document.getElementById('user-select').value;

    const newTask = { title, description, dueDate, priority, completed, userId };

    try {
        const response = await fetch("http://localhost:8080/tasker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTask)
        });

        if (response.ok) {
            alert("Task created successfully!");
            document.getElementById("task-form-container").style.display = "none";
            fetchTasks(userId);
        } else {
            alert("Failed to create task");
        }
    } catch (error) {
        console.error("Error creating task:", error);
        alert("Error creating task");
    }
});

document.getElementById("cancel-btn").addEventListener("click", () => {
    document.getElementById("task-form-container").style.display = "none";
});
