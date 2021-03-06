import React from "react";
import * as d3 from "d3";

import '../../styles/sentiment-dynamics.css';

import { getWindowHeight } from "../utils/utils"

import source from "../../data/sentiments/by_seasons.bing.json";

const maxSentiment = d3.max(source, (d) => d3.max(d.stats, (x) => x.sentiment));
const minSentiment = d3.min(source, (d) => d3.min(d.stats, (x) => x.sentiment));

const characters = getAllCharacters();
const seasons = getAllSeasons();

prepareSourceData();

const visOffset = 100;
const animDuration = 600;
const margin = 15;

class SentimentDynamics extends React.Component {

	state = {
		season: 1,
		playing: false
	}

	scaleSentiment = d3.scaleLinear().domain([minSentiment, maxSentiment]);
	scaleCharacters = d3.scaleLinear().domain([-1, characters.length]);

	area = d3.area()
				.curve(d3.curveMonotoneX)
				.y1((d) => (this.scaleSentiment(d.sentiment)) )
    			.x((d) => (this.scaleCharacters(d.speakerId)) );

    areaData = null;

	componentDidMount() {

		// prepare container
		const ph = d3.select(this.refs.viz);
		const height = getWindowHeight() - visOffset;
		const { width } = ph.node().getBoundingClientRect();
		this.container = ph.select("svg")
							.attr("width", width)
							.attr("height", height);

		// update scales
		const chartHeight = height - 2 * margin;
		const chartWidth = width - 2 * margin;
		this.scaleSentiment.range([chartHeight, 0]);
		this.scaleCharacters.range([0, chartWidth]);

		const baseLine = this.scaleSentiment(0);
		this.area.y0(baseLine);

		// append gradient 
		const baseLineOffset = (baseLine / height) * 100;
		const stops = [
				{ offset: "0%", color: "#CD34B5" },
				{ offset: `${baseLineOffset}%`, color: "#CD34B5" },
				{ offset: `${baseLineOffset}%`, color: "#2C2C2C" },
				{ offset: "100%", color: "#2C2C2C" }
			];
		this.gradient = this.container.select("linearGradient");
		this.gradient
				.selectAll("stop")
				.data(stops)
					.attr("offset", (d) => (d.offset))
					.attr("stop-color", (d) => (d.color));

		// show chart for the first season
		this.updateViz(0);
	}

	componentDidUpdate() {
		this.updateViz(animDuration);
	}

	handleSesonClick = (e) => {
		e.preventDefault(e)
		const newSeason = d3.select(e.target).attr("season");
		const { season } = this.state;
		if (season !== newSeason) {
			this.setState({ 
				season: newSeason,
				prevSeason: season 
			});
		}
	}

	updateViz(duration = 0) {
		const data = this.getVizData();
		const chart = this.container.select("g");
		
		chart.select("path")
				.transition().duration(duration)
				.attr("d", this.area(data));

		const speakers = data.filter(realSpeakers);
		 
      	chart
      		.selectAll(".circle")
      			.data(speakers, speakerKey)
      			.transition().duration(duration)
					.attr("transform", (d) => {
						const x = this.scaleCharacters(d.speakerId);
						const y = this.scaleSentiment(d.sentiment);
						return `translate(${x}, ${y})`;
					});
	}

	render() {

		const speakers = this.getVizData().filter(function(d) { return !!d.speaker; })
		const { season } = this.state;

		return (
				<section className="sentiment-dynamics">
					<div className="viz" ref="viz">
						<svg>
							<defs>
								<linearGradient id="gradient" 
									x1="0%" x2="0%" y1="0%" y2="100%"
									gradientUnits="userSpaceOnUse">
									<stop offset="0%" stopColor="#CD34B5"/>
									<stop offset="50%" stopColor="#CD34B5"/>
									<stop offset="50%" stopColor="#2C2C2C"/>
									<stop offset="100%" stopColor="#2C2C2C"/>
								</linearGradient>
							</defs>
							<g transform={`translate(${margin}, ${margin})`}>
								<path d="" fill="url(#gradient)" />
								{ 
									speakers.map((d,i) => {
										const x = this.scaleCharacters(d.speakerId);
										const y = this.scaleSentiment(0);
										return (
											<g className="circle" 
												transform={`translate(${x}, ${y})`}
												key= { d.speakerId } 
												speaker={d.speakerId } >
													<circle r="5" />
													<text dy="4"> { d.sentiment < 0 ? "😞" : "😊" } </text>
													<text dy={ d.sentiment > 0 ? -7: 16}> { d.speaker } </text>
											</g>);
								})}
							</g>
						</svg>
					</div>
					<div className="note">
						<div className="article">
							<p>But emotions aren't static. </p>
							<p>
							   People fight and make peace. 
							   Someone finds love, someone loses his job.
							   Life is changing rapidly.  
							   And our emotions and reactions become different as well.
							</p>
							<p>
								Let's explore how changes the tone of character's speech from season to season.
							</p>
							<p>
								{ 
									seasons.map((s) => (
										<button key = { s }
											className={ `btn ${(s == season) ? "current": ""}`}
											season= { s }
											onClick = { this.handleSesonClick } >	
												{ `Season ${s}`}										
										</button>)
									)
								}
							</p>
						</div>
					</div>
				</section>
			);
	}

	getVizData() {
		const { season  } = this.state;
		const info = source.find(function(d) { return d.season == season });
		return info.stats;
	}

}

function getAllCharacters() {

	const speakers = {};
	source.forEach((s) => {
		s.stats.forEach((c) => {
			speakers[c.speaker] = true;
		})
	});
	
	return Object.keys(speakers).sort();
}

function getAllSeasons() {
	return source.map((s) => (s.season));
}

function prepareSourceData() {
	source.forEach((s) => {
		s.stats.forEach((c) => {
			c["speakerId"] = characters.indexOf(c.speaker);
		});
		s.stats.push({ speakerId: -1, sentiment: 0 });
		s.stats.push({ speakerId: characters.length, sentiment: 0 });
		s.stats.sort((a,b) => (a.speakerId - b.speakerId));
	});
}

function speakerKey(d) { return d ? d.speakerId : d3.select(this).attr("speaker"); }

function realSpeakers(d) { return !!d.speaker; }

export default SentimentDynamics;