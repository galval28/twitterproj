import fs from "fs"
import Papa from "papaparse"
import states from "./us-states.json"
import * as d3 from "d3"
import simpleheat from "./simpleheat"

let csv = fs.readFileSync(__dirname + "/uscities.csv", "utf8")
let csvContents = d3.csvParse(csv)


var lowColor = '#f9f9f9'
var highColor = '#bc2a66'

var width = 1000;
var height = 500;

function expo(x, f) {
  return Number.parseFloat(x).toExponential(f);
}
function RGBToHex(rgb) {
  let ex = /^rgb\((((((((1?[1-9]?\d)|10\d|(2[0-4]\d)|25[0-5]),\s?)){2}|((((1?[1-9]?\d)|10\d|(2[0-4]\d)|25[0-5])\s)){2})((1?[1-9]?\d)|10\d|(2[0-4]\d)|25[0-5]))|((((([1-9]?\d(\.\d+)?)|100|(\.\d+))%,\s?){2}|((([1-9]?\d(\.\d+)?)|100|(\.\d+))%\s){2})(([1-9]?\d(\.\d+)?)|100|(\.\d+))%))\)$/i;
  if (ex.test(rgb)) {
    // choose correct separator
    let sep = rgb.indexOf(",") > -1 ? "," : " ";
    // turn "rgb(r,g,b)" into [r,g,b]
    rgb = rgb.substr(4).split(")")[0].split(sep);

    // convert %s to 0–255
    for (let R in rgb) {
      let r = rgb[R];
      if (r.indexOf("%") > -1)
        rgb[R] = Math.round(r.substr(0, r.length - 1) / 100 * 255);
      /* Example:
      75% -> 191
      75/100 = 0.75, * 255 = 191.25 -> 191
      */
    }

    let r = (+rgb[0]).toString(16),
      g = (+rgb[1]).toString(16),
      b = (+rgb[2]).toString(16);

    if (r.length == 1)
      r = "0" + r;
    if (g.length == 1)
      g = "0" + g;
    if (b.length == 1)
      b = "0" + b;

    return "#" + r + g + b;

  } else {
    return "Invalid input color";
  }
}

//Create SVG element and append map to the SVG
var div = d3.select('#container');
var svgUSA = div
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("id", "svgUSA");
var canvasLayer = div.append('canvas').attr('id', 'heatmap').attr('width', width).attr('height', height)
var canvas = canvasLayer.node();
var heat = simpleheat(canvas);
var svgCircles = div
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("id", "svgCircles");

// D3 Projection
var projection = d3.geoAlbersUsa()
  .translate([width / 2, height / 2])    // translate to center of screen
  .scale([1000]);          // scale things down so see entire US

// Define path generator
var path = d3.geoPath()               // path generator that will convert GeoJSON to SVG paths
  .projection(projection);  // tell path generator to use albersUsa projection
//console.log(csvContents[10][17])
const max = Math.max(...csvContents.map((d) => d.population))
// set data of [[x, y, value], ...] format
let data = [];
for (let i = 0; i < csvContents.length; i++) {
  
  let pe = projection([csvContents[i].lng, csvContents[i].lat]);

  if (pe !== null) {
    pe.push(csvContents[i].population);
    data.push(pe);
  }
}

console.log(data)
heat.data(data)
//debugger;
svgUSA.selectAll("path")
  .data(states.features)
  .enter()
  .append("path")
  .attr("class", "continent")
  .attr("d", path)
  .style("fill", "#add6ff");
// draw points
//values[1] = cities

const circleColorFunc = (avg) =>  RGBToHex(d3.interpolateHsl("blue", "red")(avg))
svgCircles.selectAll("circle")
  .data(csvContents)
  .enter()
  .append("circle")
  .filter((d) => {
    //should be orderless so trivially parralizeable
    let pe = projection([d.lng, d.lat]);
    let happy = (d.sentiment / (1 + d.numTweets));

    if (happy === 0) {
      return false;
    }
    //console.log(RGBToHex(d3.interpolateLab("blue", "red")(d.sentiment/(1+d.numTweets))))
    if (pe === null) {
      //console.log("skipping  " + d.city_ascii)
      return false;
    }
    return true;
  })
  .attr("class", "circles")
  .attr("cx", function (d) {
    return projection([d.lng, d.lat])[0];
  })
  .attr("cy", function (d) { return projection([d.lng, d.lat])[1]; })
  .attr("r", "2px")
  .style("fill", function (d) { return circleColorFunc(d.sentiment / (d.numTweets)) });

  function makeGradient(colorFunc, minVal, maxVal) {
  const scale = d3.scaleLinear().domain([minVal,maxVal]).range([0,1])
  const samples = 20; 
  const stepSize = (maxVal-minVal)/samples;
  let grad = {};
  for(let i=0; i<samples; i++){
    const offset = stepSize*i;
    const samplePoint = offset+minVal;
    const colorStopPoint = scale(samplePoint)
    grad[colorStopPoint]=colorFunc(samplePoint)
  }
  return grad;
}
function drawLegend(minVal, maxVal, grad, ID) {
  const canvasSel = d3.select("#"+ID+" > canvas");
  const canvas= canvasSel.node();
  const width = canvas.width;
  const height = canvas.height;
  const context = canvas.getContext("2d");
  const notchnum = 10;
  const gradWidth = .3 * width;
  const gradient = context.createLinearGradient(0, 0, 0, height);
  for (var i in grad) {
    gradient.addColorStop(+i, grad[i]);
  }
  context.clearRect(0, 0, width, height);
  context.fillStyle = gradient;
  context.fillRect(0, 0, gradWidth, height);
  context.strokeStyle=("1px black")
  context.beginPath();
  context.moveTo(gradWidth,0)
  context.lineTo(gradWidth,height)
  context.fillStyle = "black";
  
  for(let i=0; i<notchnum+1; i++){
    context.moveTo(gradWidth,i*((height)/notchnum))
    context.lineTo(width, i*((height)/notchnum))
    context.font="8px Arial";
    context.fillText(expo(minVal+i*((maxVal-minVal)/notchnum),3),gradWidth, i*((height)/notchnum))
  }

}

/* When the user clicks on the button,
toggle between hiding and showing the dropdown content */
function myFunction() {
  document.getElementById("myDropdown").classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function(event) {
  if (!event.target.matches('.dropbtn')) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}

console.log(max);
heat.max(max);
heat.radius(5, 8);
heat.draw(0.05);
//drawLegend(0, max, heat.defaultGradient);
drawLegend(0,max,heat.defaultGradient,"legendContainer")
drawLegend(-1,1,makeGradient(circleColorFunc,-1,1),"secondLegend");
//debugger;
console.log("done");



