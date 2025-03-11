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
    fetchTasks(event.target.value);
});

// Initial fetch of users and tasks
fetchUsers();
