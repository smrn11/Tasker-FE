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

    // Create y-axis scale for positioning tasks based on their index (order of appearance)
    const yScale = d3.scaleBand()
        .domain(tasks.map((d, i) => i))  // Create a band scale based on task index (position in list)
        .range([50, height - 50])  // Adjust the range to fit the available space
        .padding(0.1);  // Space between tasks

    // Create x-axis
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat("%b %d"))  // Format the dates as "March 10"
        .tickSize(10);

    // Create y-axis for task order (index-based)
    const yAxis = d3.axisLeft(yScale)
        .tickFormat("")  // Hide the axis values for now
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
        .attr("cy", function(d, i) {
            return yScale(i) + yScale.bandwidth() / 2;  // Center the bubbles vertically in each band
        })
        .attr("r", function(d) {
            return priorityScale[d.priority] || 30;
        })
        .attr("fill", function(d) {
            if (d.priority === "HIGH") return "red";  // Red for high priority
            if (d.priority === "LOW") return "green"; // Green for low priority
            return "yellow";  // Yellow for medium priority
        })
        .attr("opacity", 0.7);

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
        .attr("y", function(d, i) {
            const radius = priorityScale[d.priority] || 30;
            return yScale(i) + yScale.bandwidth() / 2 + radius + 15;  // Position labels below bubbles
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

// Initial fetch of tasks for user 1
fetchTasks(1);

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
            fetchTasks(1); // Refresh the task list
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
