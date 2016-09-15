const C1 = "#586f7c";
const C2 = "#c8bfc7";
const C3 = "#353535";
const C4 = "#7ea8be";
const C5 = "#f2f2f2";

window.onload = function(){
	bubbleChart(null)	
}

/*Return the root parent with depth=1 of node e*/
function rootParent(d,e){
	if(e.depth > d)
		return rootParent(d,e.parent)
	else
		return e
}

/*Return the status of radio buttons in mode panel*/
function statusRadioButton(){
	if(document.getElementById('view_all').checked)
		return 0
	else
		return 1
}

/*Delete and rewrite chart*/
function rewriteBubbleChart(n){
	var svg = d3.select("svg")

	svg.selectAll("text")
		.remove()
		
	svg.selectAll("circle")
		.remove()
	
	svg.remove()

	b_selected = document.getElementById('view_selected')
	b_all = document.getElementById('view_all')
	b_selected.checked = false
	b_all.checked = true
	radioChecked(b_selected)
	radioChecked(b_all)

	var rootButton = document.getElementById('root-button')
	if(n == null){
		rootButton.disabled = true
		rootButton.style.opacity = 0.6
	}
	else{
		rootButton.disabled = false
		rootButton.style.opacity = 1
	}

	bubbleChart(n)
}

function bubbleChart(n){
var margin = 10,
		diameter = 800;

	var linearSize = d3.scale.linear()
		.domain([1,13688])
		.range([10,13688])

	//Layout settings for bubbles
	var pack = d3.layout.pack()
		.padding(1)
		.size([diameter - margin, diameter - margin])
		.value(function(d) { return linearSize(d.size); })
		.sort(function(a, b) {return -(a.value - b.value);})

	//Select div that will contain chart and add svg element
	var svg = d3.select("div#chart")
		.classed("svg-container", true) //container class to make it responsive
		.append("svg")
		.attr("preserveAspectRatio", "xMinYMin meet")
		.attr("viewBox", "0 0 " + diameter + " " + diameter + "") //Responsive SVG
		.classed("svg-content-responsive", true)
		.append("g")
		.attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

	//Read json file
	d3.json("data/data.json", function(error, root) {
		if (error) throw error;

		//Select node with size minor of n
		if (n != null)
			root.children = (root.children).filter(function(d){
				if(d.size <= n)
					return d
			})

		//Start with focus on root
		var focus = root,
			nodes = pack.nodes(root),
			view;

		//Count machines
		var count_machines = 0;
		var maxR = 0;
		for(i in root.children){
			count_machines += root.children[i].size;
			
			if(root.children[i].r > maxR)
				maxR = root.children[i].r;
		}
		
		document.getElementById("size").innerHTML = count_machines + " Machines";

		var circle = svg.selectAll("circle")
			.data(nodes)
			.enter().append("circle")
			.attr("class", function(d) { return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root"; })
			.style("fill", function(d) {
				if(d.depth == 0)
					return color(d.depth)
				else
					if (d.parent.r == d.r && d.depth != 4){
						return color(d.parent.depth)
					}
					else
						return color(d.depth)
			})
			.on("click", function(d) {
				//Choose action based on type of mode: zoom or nodes selection
				if (focus != d && !statusRadioButton())
					if (d.depth != 4)
						zoom(d), d3.event.stopPropagation();
					else
						zoom(d.parent), d3.event.stopPropagation();
				else if(statusRadioButton())
					rewriteBubbleChart(d.size)
			})
			.on("mouseover",function(d,i){
				writeNodeInformation(d)
				
				var machines = document.getElementById("size")
				machines.innerHTML = d.size + " Machines";
				machines.style.color = color(d.depth)
				//Highlight only node with size minor of node selected e
				svg.selectAll("circle")
					.attr("opacity",function(e){
						if(statusRadioButton())
							return rootParent(1,e).size <= rootParent(1,d).size ? null : 0.4;
						else
							return e != d && rootParent(d.depth,e) != d ? 0.4 : null;
					})
		   ;})
		   .on("mouseout",function(d,i){
				deleteNodeInformation(d)

				var machines = document.getElementById("size")
				machines.innerHTML = count_machines + " Machines";
				machines.style.color = "black"
				
				svg.selectAll("circle")
				.attr("opacity",null)
		   ;})
		
		circle.append("title")
			.text(function(){return statusRadioButton() ? "Click to Redraw" : "Click to Zoom" })

		var text = svg.selectAll("text").filter(".chart")
			.data(nodes)
			.enter().append("text")
			.attr("class", "label chart")
			.style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })
			.style("display", function(d) { return d.parent === root ? "inline" : "none"; })
			.attr("text-anchor", "middle")
			.attr("dy", ".35em")
			.text(function(d) {
				var name = d.name
				name = name.replace(" ","\n")
				return (d.r/maxR)*100 >= 20 ? toAcronym(d.name) : null
			})

		
		var node = svg.selectAll("circle,text");

		d3.select("body")
			.on("click", function() { zoom(root); });

		//Initial focus on all bubbles
		zoomTo([root.x, root.y, root.r * 2 + margin]);

		function zoom(d) {
			var focus0 = focus; focus = d;

			var transition = d3.transition()
				.duration(d3.event.altKey ? 7500 : 750)
				.tween("zoom", function(d) {
					var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
					return function(t) { zoomTo(i(t)); };
				});

			transition.selectAll("text").filter(".chart")
				.filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
				.transition().duration(function(){return focus.depth > focus0.depth ? 200 : 0})
				.style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; })
				.attr("class", "label chart")
				.each("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
				.each("end", function(d) { if (d.parent !== focus) this.style.display = "none"; })
				.text(function(e) {
					if(d.name == "machine"){
						return (e.r/maxR)*100 >= 20 ? toAcronym(e.name) : null
					}
					else{
						return (e.r/d.r)*100 >= 5 ? e.name : null
					}
				})
				
		}

		function zoomTo(v) {
			var k = diameter / v[2]; view = v;
			node.attr("transform", function(d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"; });
			circle.attr("r", function(d) { return d.r * k; });
		}
	});
	d3.select(self.frameElement).style("height", diameter + "px");
}

function writeNodeInformation(n){
	if(n.depth != 0){
		var label;
		switch(n.depth){
			case 1: label="distro";
					break;
			case 2: label="class";
					break;
			case 3: label="arch";
					break;
			case 4: label="cores";
					break;
			default: label="-";
					break;
		}
		textBox = document.getElementById(label)
		textBox.innerHTML = n.name;
		textBox.style.color = color(n.depth)
		writeNodeInformation(n.parent)
	}
	else
		return null;
}

function deleteNodeInformation(n){
	document.getElementById("distro").innerHTML = "-";
	document.getElementById("class").innerHTML = "-";
	document.getElementById("arch").innerHTML = "-";
	document.getElementById("cores").innerHTML = "-";
}

function radioChecked(e){
	labels = document.getElementById("view-form").getElementsByTagName("label");
	var circle = d3.select("svg").selectAll("circle")
	if(labels[0].getAttribute("for") == e.getAttribute("id")){
		labels[0].style.fontWeight = "bold"
		labels[1].style.fontWeight = "normal"
		circle.select("title").text("Click to Zoom")
	}
	else{
		labels[1].style.fontWeight = "bold"
		labels[0].style.fontWeight = "normal"
		circle.select("title").text("Click to Redraw")
	}
}

function checkVisible(elm) {
  var rect = elm.getBoundingClientRect();
  var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
  return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
}

function toAcronym(s){
	words = s.split(" ")
	var out = ""
	if(words.length > 1){
		for(i in words){
			out += words[i][0] + " "
		}
		return out
	}
	else
		return s
}

function color(d){
	switch(d){
		case -1:
			return "#729EA1";
			break;
		case 1:
			return "#7CB518";
			break;

		case 2:
			return "#F7B32B";
			break;

		case 3:
			return "#5BC0EB";
			break;

		case 4:
			return "#EF5B5B";
			break;
			
		default:
			return C5;
			break;
	}
}
