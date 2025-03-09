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

    // Get the earliest and latest task dates
    const earliestDate = d3.min(tasks, task => task.dueDate);
    const latestDate = d3.max(tasks, task => task.dueDate);

    // Extend the domain to include 1 day before the earliest task and 1 day after the latest task
    const xScale = d3.scaleTime()
        .domain([d3.timeDay.offset(earliestDate, -1), d3.timeDay.offset(latestDate, 1)])  // Adjust by 1 day before and after
        .range([50, width - 50]);

    // Create x-axis
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat("%b %d"))  // Format the dates as "March 10"
        .tickSize(10);

    // Clear existing content before appending new elements
    svg.selectAll("*").remove();

    // Append x-axis to SVG and style the font size of labels
    svg.append("g")
        .attr("transform", `translate(0, ${height - 50})`)  // Position it at the bottom
        .call(xAxis)
        .selectAll("text")
        .style("font-size", "14px");  // Increase font size of x-axis labels

    // Bind data to circles (bubbles)
    const bubbles = svg.selectAll("circle")
        .data(tasks)
        .enter()
        .append("circle")
        .attr("cx", function(d) {
            return xScale(d.dueDate);
        })
        .attr("cy", height / 2)
        .attr("r", function(d) {
            return priorityScale[d.priority] || 30;
        })
        .attr("fill", function(d) {
            return d.completed ? "green" : "red";
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
        .attr("y", function(d) {
            const radius = priorityScale[d.priority] || 30;
            return height / 2 + radius + 15;
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
