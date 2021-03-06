
// data variables
let script = null
let scriptRegex = null
let inline = null
let parsedScript = null
let scriptOnly = null
let nestedChar = null
let characterLines = null
let metaLines = null
let title0 = null
let title1 = null
let title2 = null
let firstClicked = null
let secondClicked = null

let splitNest = null
let encCircle = null
let boundingCircles = null

// chart variables
let width = 0;
let height = 0;
let graphicW = 0;
let graphicH = 0;
let fontSize = 12;
let margin = null;
let maxRow = null
let nestedLengths = null
let activeLength = null

// user inputs
let inputCategories = null

let rowLength = 4

const MARGIN = 32;

const scaleR = d3.scaleSqrt();
const scaleStrengthX = d3.scaleLinear();
const scaleStrengthY = d3.scaleLinear();
const colorScale = d3.scaleOrdinal()
	.range(["#61514d", "#00d7ac", "#a9004e", "#0071c8", "#ff7670", "#e472e1"])

const bodySel = d3.select('body');
const chartSel = bodySel.select('.graphic');
const svg = chartSel.select('svg');

document.getElementById('input-file')
  .addEventListener('change', getFile)

function getFile(event) {
	const input = event.target
  if ('files' in input && input.files.length > 0) {
	  placeFileContent(
      document.getElementById('content-target'),
      input.files[0])
  }
}

function placeFileContent(target, file) {
	readFileContent(file).then(content => {
  	target.value = content
  }).catch(error => console.log(error))
}

function readFileContent(file) {
	const reader = new FileReader()
  return new Promise((resolve, reject) => {
    reader.onload = event => {
    	script = event.target.result
    	setup()
    }
    reader.onerror = error => reject(error)
    reader.readAsText(file)
  })
}


function hideIntro(){
	d3.select('.intro')
		.classed('collapsed', true)

	let label = d3.select('.file--container__label')
		.text("use new script")

	let header = d3.select('.header')
		.classed('shrunk', true)
		
	header.select('.header--attribution')
		.transition()
		.duration(350)
		.style("opacity", 0)

	header.select('.header--title')
		.transition()
		.duration(350)
		.style('font-size', '32px')

	d3.select('.file--container')
		.classed('uploaded', true)

	d3.select('.fileUpload')
		.style("margin-top", "0px")

}

function setup(){
	setupScriptRegex()
	defineInline()
	parsedScript = parseToJson()
	cleanScript()
	hideIntro()
}

function cleanScript(){
	isolateScript()
	isolateCharacters()
	setupForm()
}


///////// Much of the following code comes from Fountain.js https://github.com/mattdaly/Fountain.js 
///////// and this forked repo https://github.com/archisgore/Fountain.js

function setupScriptRegex(){
	scriptRegex = [{
		title_page: /^((?:title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:)/gim,
		scene_heading: /^((?:\*{0,3}_?)?(?:(?:int|ext|est|i\/e)[. ]).+)|^(?:\.(?!\.+))(.+)/i,
		scene_number: /( *#(.+)# *)/,

		transition: /^((?:FADE (?:TO BLACK|OUT)|CUT TO BLACK)\.|.+ TO\:)|^(?:> *)(.+)/,

		dialogue: /^([A-Z*_]+[0-9A-Z (._\-')]*)(\^?)?(?:\n(?!\n+))([\s\S]+)/,
		parenthetical: /^(\(.+\))$/,

		action: /^(.+)/g,
		centered: /^(?:> *)(.+)(?: *<)(\n.+)*/g,

		section: /^(#+)(?: *)(.*)/,
		synopsis: /^(?:\=(?!\=+) *)(.*)/,

		note: /^(?:\[{2}(?!\[+))(.+)(?:\]{2}(?!\[+))$/,
		note_inline: /(?:\[{2}(?!\[+))([\s\S]+?)(?:\]{2}(?!\[+))/g,
		boneyard: /(^\/\*|^\*\/)$/g,

		page_break: /^\={3,}$/,
		line_break: /^ {2}$/,

		emphasis: /(_|\*{1,3}|_\*{1,3}|\*{1,3}_)(.+)(_|\*{1,3}|_\*{1,3}|\*{1,3}_)/g,
		bold_italic_underline: /(_{1}\*{3}(?=.+\*{3}_{1})|\*{3}_{1}(?=.+_{1}\*{3}))(.+?)(\*{3}_{1}|_{1}\*{3})/g,
		bold_underline: /(_{1}\*{2}(?=.+\*{2}_{1})|\*{2}_{1}(?=.+_{1}\*{2}))(.+?)(\*{2}_{1}|_{1}\*{2})/g,
		italic_underline: /(?:_{1}\*{1}(?=.+\*{1}_{1})|\*{1}_{1}(?=.+_{1}\*{1}))(.+?)(\*{1}_{1}|_{1}\*{1})/g,
		bold_italic: /(\*{3}(?=.+\*{3}))(.+?)(\*{3})/g,
		bold: /(\*{2}(?=.+\*{2}))(.+?)(\*{2})/g,
		italic: /(\*{1}(?=.+\*{1}))(.+?)(\*{1})/g,
		underline: /(_{1}(?=.+_{1}))(.+?)(_{1})/g,

		splitter: /\n{2,}/g,
		cleaner: /^\n+|\n+$/,
		standardizer: /\r\n|\r/g,
		whitespacer: /^\t+|^ {3,}/gm
  }]
}

function lexer(script){

	return script.replace(scriptRegex[0].boneyard, '\n$1\n')
				 .replace(scriptRegex[0].standardizer, '\n')
				 .replace(scriptRegex[0].cleaner, '')
				 .replace(scriptRegex[0].whitespacer, '');
}

function tokenize(){
	var src    = lexer(script).split(scriptRegex[0].splitter)
	  , i      = src.length, line, match, parts, text, meta, x, xlen, dual
	  , tokens = [];

	while (i--) {
	  line = src[i];

	  // title page
	  if (scriptRegex[0].title_page.test(line)) {
		match = line.replace(scriptRegex[0].title_page, '\n$1').split(scriptRegex[0].splitter).reverse();
		for (x = 0, xlen = match.length; x < xlen; x++) {
		  parts = match[x].replace(scriptRegex[0].cleaner, '').split(/\:\n*/);
		  tokens.push({ type: parts[0].trim().toLowerCase().replace(' ', '_'), text: parts[1].trim() });
		}
		continue;
	  }

	  // scene headings
	  if (match = line.match(scriptRegex[0].scene_heading)) {
		text = match[1] || match[2];

		if (text.indexOf('  ') !== text.length - 2) {
		  if (meta = text.match(scriptRegex[0].scene_number)) {
			meta = meta[2];
			text = text.replace(scriptRegex[0].scene_number, '');
		  }
		  tokens.push({ type: 'scene_heading', text: text, scene_number: meta || undefined });
		}
		continue;
	  }

	  // centered
	  if (match = line.match(scriptRegex[0].centered)) {
		tokens.push({ type: 'centered', text: match[0].replace(/>|</g, '') });
		continue;
	  }

	  // transitions
	  if (match = line.match(scriptRegex[0].transition)) {
		tokens.push({ type: 'transition', text: match[1] || match[2] });
		continue;
	  }

	  // dialogue blocks - characters, parentheticals and dialogue
	  if (match = line.match(scriptRegex[0].dialogue)) {
		if (match[1].indexOf('  ') !== match[1].length - 2) {
		  // we're iterating from the bottom up, so we need to push these backwards
		  if (match[2]) {
			tokens.push({ type: 'dual_dialogue_end' });
		  }

		  tokens.push({ type: 'dialogue_end' });

		  parts = match[3].split(/(\(.+\))(?:\n+)/).reverse();

		  for (x = 0, xlen = parts.length; x < xlen; x++) {
			text = parts[x];

			if (text.length > 0) {
			  tokens.push({ type: scriptRegex[0].parenthetical.test(text) ? 'parenthetical' : 'dialogue', text: text });
			}
		  }

		  tokens.push({ type: 'character', text: match[1].trim() });
		  tokens.push({ type: 'dialogue_begin', dual: match[2] ? 'right' : dual ? 'left' : undefined });

		  if (dual) {
			tokens.push({ type: 'dual_dialogue_begin' });
		  }

		  dual = match[2] ? true : false;
		  continue;
		}
	  }

	  // section
	  if (match = line.match(scriptRegex[0].section)) {
		tokens.push({ type: 'section', text: match[2], depth: match[1].length });
		continue;
	  }

	  // synopsis
	  if (match = line.match(scriptRegex[0].synopsis)) {
		tokens.push({ type: 'synopsis', text: match[1] });
		continue;
	  }

	  // notes
	  if (match = line.match(scriptRegex[0].note)) {
		tokens.push({ type: 'note', text: match[1]});
		continue;
	  }

	  // boneyard
	  if (match = line.match(scriptRegex[0].boneyard)) {
		tokens.push({ type: match[0][0] === '/' ? 'boneyard_begin' : 'boneyard_end' });
		continue;
	  }

	  // page breaks
	  if (scriptRegex[0].page_break.test(line)) {
		tokens.push({ type: 'page_break' });
		continue;
	  }

	  // line breaks
	  if (scriptRegex[0].line_break.test(line)) {
		tokens.push({ type: 'line_break' });
		continue;
	  }

	  tokens.push({ type: 'action', text: line });
	}

	return tokens;
}

function defineInline(){
	inline = [{
		note: '<!-- $1 -->',

		line_break: '<br />',

		bold_italic_underline: '<span class=\"bold italic underline\">$2</span>',
		bold_underline: '<span class=\"bold underline\">$2</span>',
		italic_underline: '<span class=\"italic underline\">$2</span>',
		bold_italic: '<span class=\"bold italic\">$2</span>',
		bold: '<span class=\"bold\">$2</span>',
		italic: '<span class=\"italic\">$2</span>',
		underline: '<span class=\"underline\">$2</span>'
  }]
}

function inlineLexer(s){
	if (!s) {
	  return;
	}

	var styles = [ 'underline', 'italic', 'bold', 'bold_italic', 'italic_underline', 'bold_underline', 'bold_italic_underline' ]
		   , i = styles.length, style, match;

	s = s.replace(scriptRegex[0].note_inline, inline.note).replace(/\\\*/g, '[star]').replace(/\\_/g, '[underline]').replace(/\n/g, inline.line_break);

   // if (regex.emphasis.test(s)) {                         // this was causing only every other occurence of an emphasis syntax to be parsed
	  while (i--) {
		style = styles[i];
		match = scriptRegex[0][style];
   
		if (match.test(s)) {
		  s = s.replace(match, inline[style]);
		}
	  }
   // }

	return s.replace(/\[star\]/g, '*').replace(/\[underline\]/g, '_').trim();
}

function pushToArray(maybeArray, stuffToPush) {
	if (typeof maybeArray == 'undefined') {
	  maybeArray = []
	}

	if (Array.isArray(maybeArray)) {
	  maybeArray.push(stuffToPush);
	} else {
      console.trace();
	  throw "First parameter to this function must be a proper array. Instead got: " + JSON.stringify(maybeArray);
	}

	return maybeArray;
}

function parseToJson(script, toks, callback) {
	if (callback === undefined && typeof toks === 'function') {
	  callback = toks;
	  toks = undefined;
	}

	var tokens = tokenize(script)
	  , i      = tokens.length, token
	  , title, output = {};

	output.title_page = {};
	output.script = {}; //script is an array of scenes

	output.tokens = toks ? tokens.reverse() : undefined;

	var scene = []; //the current running scene
    var dialogue = {type: "unknown"}; //the current running dialogue
    var character = {type: "unknown"}; //the current running character

	while (i--) {
	  token = tokens[i];
	  token.text = inlineLexer(token.text);

	  switch (token.type) {
		case 'title':
		  output.title = token.text.replace('<br />', ' ').replace(/<(?:.|\n)*?>/g, '');
		  output.title_page.title = pushToArray(output.title_page.title, output.title);
		  break;
		case 'credit':
		  output.title_page.credit = pushToArray(output.title_page.credit, token.text);
		  break;
		case 'author':
		case 'authors':
		  output.title_page.authors = pushToArray(output.title_page.authors, token.text);
		  break;
		case 'source':
		  output.title_page.source = pushToArray(output.title_page.source, token.text);
		  break;
		case 'notes':
		  output.title_page.notes = pushToArray(output.title_page.notes, token.text);
		  break;
		case 'draft_date':
		  output.title_page.draftdate = pushToArray(output.title_page.draftdate, token.text);
		  break;
		case 'date':
		  output.title_page.date = pushToArray(output.title_page.date, token.text);
		  break;
		case 'contact':
		  output.title_page.contact = pushToArray(output.title_page.contact, token.text);
		  break;
		case 'copyright':
		  output.title_page.copyright = pushToArray(output.title_page.copyright, token.text);
		  break;

		case 'scene_heading':
          output.script.scenes = pushToArray(output.script.scenes, scene);
          scene = [];
          scene = pushToArray(scene,
              {type: "heading", "scene_number": token.scene_number, "heading": token.text});
          break;

        case 'transition':
          //push the current running scene onto the list, and begin a new one
          scene = pushToArray(scene, {type: "transition", text: token.text});
          break;


        case 'dual_dialogue_begin':
          dialogue.characters = pushToArray(dialogue.characters, character);
			character = {type: "unkown"};
          scene = pushToArray(scene, dialogue);
            dialogue = {type: "dialogue-dual"};
		  break;
		case 'dialogue_begin':
          dialogue.characters = pushToArray(dialogue.characters, character);
			character = {type: "unkown"};
          scene = pushToArray(scene, dialogue);
          dialogue = {type: (token.dual ? "dialogue-dual" : 'dialogue-single')};
		  break;
        case 'character':
          dialogue.characters = pushToArray(dialogue.characters, character);
          let name = token.text
          let cleanName = name.replace(/ *\([^)]*\) */g, "")
          character = {type: "character", name: cleanName};
		  break;
		case 'parenthetical':
          //character.lines = pushToArray(character.lines, {type: "parenthetical", text: token.text});
		  break;
		case 'dialogue':
          character.lines = pushToArray(character.lines, {type: "line", text: token.text});
		  break;
		case 'dialogue_end':
		case 'dual_dialogue_end':
          // dialogue.characters = pushToArray(dialogue.characters, character);
          // scene = pushToArray(scene, dialogue);
          // dialogue = {type: "dialogue-single"};
		  break;

		case 'section':
          scene = pushToArray(scene, {type: "section", name: token.text});
		  break;
		case 'synopsis':
          scene = pushToArray(scene, {type: "synopsis", text: token.text});
		  break;

		case 'note':
		case 'boneyard_begin':
		case 'boneyard_end':
            //NO OP
              break;

		case 'action':
        case 'centered':
          scene = pushToArray(scene, {type: "action", text: token.text});
		  break;

		case 'page_break':
		case 'line_break':

            //NO OP
		  break;
	  }
	}

    //ensure we track any dangling state:
    dialogue.characters = pushToArray(dialogue.characters, character);
    scene = pushToArray(scene, dialogue);
    output.script.scenes = pushToArray(output.script.scenes, scene);

	if (typeof callback === 'function') {
	  return callback(output);
	}

	return output;
}



/////////// End of code from fountain.js ///////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

function isolateScript(){
	let scenes = parsedScript.script.scenes

	let flattenedScenes = [].concat.apply([], scenes)

	scriptOnly = flattenedScenes.filter(d => d.type === "dialogue-single")

}

function isolateCharacters(){

	let charactersOnly = scriptOnly.map(d => d.characters)

	let flattenedCharacters = [].concat.apply([], charactersOnly).filter(d => d.type === "character")

	nestedChar = d3.nest()
		.key(d => d.name)
		.entries(flattenedCharacters)

	characterLines = nestedChar.map(function(d){

		let values = d.values

		let firstMap = values.map(d => d.lines)

		let flattenedValues = [].concat.apply([], firstMap)

		let secondMap = flattenedValues.map(d => d.text)
			
		return {name:d.key, lines:secondMap, totalLines:secondMap.length} 
	})

}

function setupForm(){

	const categories = d3.select('#details--categories')

	let defaultTitles = ['Gender', 'Race', 'Ability']
	title0 = defaultTitles[0]
	title1 = defaultTitles[1]
	title2 = defaultTitles[2]

	const titles = categories
		.append('g')
		.attr('class', 'g-title')

	/*titles
		.append('text')
		.text('Category Names')
		.attr('class', 'label--title')*/

	const titleGroups = titles.selectAll('.g-title__entry')
		.data(defaultTitles)

	const titleGroupsEnter = titleGroups
		.enter()
		.append('g')
		.attr('class', (d, i) => `g-title__entry title__entry${i}`)


	titleGroupsEnter
		.append('input')
		.attr('type', 'text')
		.attr('class', (d, i) => `input--title input--title__${i}`)
		.attr('placeholder', (d, i) => defaultTitles[i])
		.attr('value', (d, i) => defaultTitles[i])
		.attr('data-index', (d, i) => i)
		.on('change', updateTitle)

	const userEntries = ['A', 'B', 'C', 'D', 'E', 'F']

	const entryGroups = d3.selectAll('.g-title__entry')
		.data(userEntries)

	entryGroups
		.append('input')
		.attr('type', 'text')
		.attr('class', 'input input--0')
		.attr('placeholder', (d, i) => `${defaultTitles[i]} A`)

	entryGroups
		.append('input')
		.attr('type', 'text')
		.attr('class', 'input input--1')
		.attr('placeholder', (d, i) => `${defaultTitles[i]} B`)

	entryGroups
		.append('input')
		.attr('type', 'text')
		.attr('class', 'input input--2')
		.attr('placeholder', (d, i) => `${defaultTitles[i]} C`)

	entryGroups
		.append('input')
		.attr('type', 'text')
		.attr('class', 'input input--3')
		.attr('placeholder', (d, i) => `${defaultTitles[i]} D`)

	entryGroups
		.append('input')
		.attr('type', 'text')
		.attr('class', 'input input--4')
		.attr('placeholder', (d, i) => `${defaultTitles[i]} E`)

	entryGroups
		.append('input')
		.attr('type', 'text')
		.attr('class', 'input input--5')
		.attr('placeholder', (d, i) => `${defaultTitles[i]} F`)

	let test = d3.selectAll('.input')

	let nodes = test._groups[0]

	let testValues = [].map.call(nodes, function( input ) {
        return input.value;
    })

    let saveButton = d3.select('.form--save')

    saveButton
    	.on('click', saveCategories)

	const characters = d3.select('#details--characters')

	const groups = characters.selectAll('.g-group')
		.data(characterLines)

	const groupEnter = groups
		.enter()
		.append('g')
		.attr('class', d => `g-group g-${d.name}`)

	groupEnter
		.append('text')
		.text(d => d.name)
		.attr('class', 'character--label')

	groupEnter
		.append('select')
		.attr('class', 'dropdown dropdown--0')

	groupEnter
		.append('select')
		.attr('class', 'dropdown dropdown--1')

	groupEnter
		.append('select')
		.attr('class', 'dropdown dropdown--2')

	d3.select('.form')
		.classed('form--expanded', true)

}

function saveCategories(){
	// Finding selected titles
	let categoryTitles = d3.selectAll('.input--title')

	let titleNodes = categoryTitles._groups[0]

	let titles = [].map.call(titleNodes, function( input ) {
		return input.value;
	})

	let categoryInputs = d3.selectAll('.input')

	let nodes = categoryInputs._groups[0]

	let values = [].map.call(nodes, function( input ) {
		return input.value;
	})

	let column1 = values.slice(0, 6).filter(d => d)
	let column2 = values.slice(6, 12).filter(d => d)
	let column3 = values.slice(12, 17).filter(d => d)

	let column = [column1, column2, column3]

	inputCategories = titles.map(function(d, i){
		return {title: d, labels: column[i]}
	})

	console.log({inputCategories})

	d3.select('.form--wrapper__step1')
		.classed('wrapper--collapsed', true)

	d3.select('.form--header__step1')
		.on('click', expandCollapseStep1)

	d3.select('.form--step2')
		.classed('form--expanded', true)

		console.log({inputCategories})

	d3.selectAll('.dropdown--0')
		.selectAll('option')
		.data(column1)
		.enter()
	      .append("option")
	      .attr("value", (d, i) => i)
	      .text(d => d)

	d3.selectAll('.dropdown--1')
		.selectAll('option')
		.data(column2)
		.enter()
	      .append("option")
	      .attr("value", (d, i) => i)
	      .text(d => d)

	d3.selectAll('.dropdown--2')
		.selectAll('option')
		.data(column3)
		.enter()
	      .append("option")
	      .attr("value", (d, i) => i)
	      .text(d => d)



}

function expandCollapseStep1(){
	let selected = d3.select('.form--step1')

	let form = selected.select('.form--wrapper')

	form
		.classed('wrapper--collapsed', form.classed('wrapper--collapsed') ? false : true)

	let button = d3.select('.form--expand__button')

	button
		.text(form.classed('wrapper--collapsed') ? 'Expand' : 'Collapse')

	let arrow = d3.select('.fas')

	arrow
		.classed('fa-angle-down', form.classed('wrapper--collapsed') ? true : false)
		.classed('fa-angle-up', form.classed('wrapper--collapsed') ? false : true)

		console.log({form})

}

function handleClick(){

	//serialize data function

	let inputGender = handleFormElements('.input--0')
	let inputRace = handleFormElements('.input--1')
	let inputAbility = handleFormElements('.input--2')

	metaLines = characterLines

	metaLines.forEach((d, i) => d[title0] = inputGender[i])
	metaLines.forEach((d, i) => d[title1] = inputRace[i])
	metaLines.forEach((d, i) => d[title2] = inputAbility[i])


	toggleDetail()
	setupChart()

	console.log(metaLines)

}

function handleFormElements(selector){
	let form = d3.select('#details--categories')

	let formNodeList = form.selectAll(selector)._groups[0]

	let formArray = Array.from(formNodeList)

	let formArrayValue = formArray.map(d => d.value)

	return formArrayValue

}

function toggleDetail(){
	let form = d3.select('#details--categories')

	form
		.classed('is-hidden', !form.classed('is-hidden'))

	let formClass = form.classed('is-hidden')

	let toggleButton = d3.select('#detailToggle')

	toggleButton
		.attr('value', (formClass) ? 'Show Details' : 'Hide Details!')
}

function updateTitle(){
	let newTitle = d3.select(this).node().value

	let parent = d3.select(this.parentNode)

	let inputs = parent.selectAll('.input')

	let letters = ['A', 'B', 'C', 'D', 'E', 'F']

	inputs
		.attr('placeholder', (d, i) => `${newTitle} ${letters[i]}`)

}

/////////////////////////////////////////////////////////////////////////////////////////////////////

function setupChart(){
	setupDOM()
	updateDimensions()
	updateScales()
	updateDOM()
	nestLines()

}

function translate(x, y) {
	return `translate(${x}, ${y})`;
}

function setupDOM() {

	const gEnter = svg
		.append('g')
		.attr('class', 'g-plot');

	gEnter
		.append('g')
		.attr('class', 'g-circleChar');
}

function updateDimensions() {
	width = chartSel.node().offsetWidth;
	height = window.innerHeight;
	console.log(width)

	fontSize = 11;

	margin = {
		top: fontSize * 10,
		left: fontSize * 2,
		right: fontSize * 2,
		bottom: fontSize * 10,
	};

	// graphicW = isMobile ? 320 : 450;
	graphicW = width - (margin.left + margin.right);
	graphicH = height - (margin.top + margin.bottom);
}

function updateScales() {
	scaleStrengthX
		.domain([-1, 1])
		.range([1, 1]);

	scaleStrengthY
		.domain([0, 1])
		.range([0.9, 0.6]);

	const maxCircleR = 40;

	scaleR
		.range([3, maxCircleR])
		.domain(d3.extent(metaLines, d => d.totalLines));

}

function updateButtons(){

	let sort0 = d3.select('#sortButton--0')

	sort0
		.attr('value', title0)
		.on('click', d => {	
			handleSortButtonClick(sort0)
		})

	let sort1 = d3.select('#sortButton--1')

	sort1
		.attr('value', title1)
		.on('click', d => {	
			handleSortButtonClick(sort1)
		})

	let sort2 = d3.select('#sortButton--2')

	sort2
		.attr('value', title2)
		.on('click', d => {	
			handleSortButtonClick(sort2)
		})

}

function handleSortButtonClick(input){

	// select all buttons that are active before the button was clicked
	let activeButtons = d3.selectAll('.sortButton.is-active')
	activeLength = activeButtons.size()

	if (activeLength === 2){
		d3.selectAll('.sortButton.is-active')
			.classed('is-active', false)
	}

	input
		.classed('is-active', !input.classed('is-active'))

	// select all buttons that are active after the button was clicked
	activeButtons = d3.selectAll('.sortButton.is-active')
	activeLength = activeButtons.size()

	console.log({input, activeButtons, activeLength})


	if (activeLength === 0){
		d3.selectAll('.sortButton.is-active')
			.classed('is-active', false)

		groupBubbles()
	}


	if (activeLength === 1){

		let splitValue = input._groups[0][0].value

		splitBubbles(splitValue)

	}

	if (activeLength === 2){

		let colorValue = input._groups[0][0].value

		colorBubbles(colorValue)
	}


}

function updateDOM() {
	svg.attr('width', graphicW).attr('height', graphicH);

	const g = svg.select('.g-plot');

	g
		.attr('transform', translate(10, fontSize));


	groupBubbles()

	const circleChar = g.select('.g-circleChar');

	const circleGroup = circleChar
		.selectAll('.g-circle')
		.data(metaLines);

	const circleGroupEnter = circleGroup
		.enter()
		.append('g')
		.attr('class', 'g-circle')

	circleGroupEnter
		.append('circle')
		.attr('class', d => `circle circle--${d.name}`)
		.attr('r', d => scaleR(d.totalLines))
		.attr('cx', d => d.x)
		.attr('cy', d => d.y)
		//.on('mouseover', handleMouseover)
		//.on('mouseout', handleMouseout)

		updateButtons()

}

/*function encloseCircles(){
	const g = svg.select('.g-circleChar');

	console.log({splitNest})

	const enclosingGroup = g
		.selectAll('.g-encl')
		.data(metaLines)

	const enclosingCircleAttr = d3.packEnclose(metaLines);

	console.log({enclosingCircleAttr})

	const enclosingCircle = enclosingGroup
		.enter()
      	.append("circle")
      	.datum(enclosingCircleAttr)
      	.attr("class", "enclosing-circle")
      	.attr('r', 10)
      	.attr("cx", function(d) {
          return d.x;
        })
        .attr("cy", function(d) {
          return d.y;
        })
}*/

function nestLines(){
	let nested0 = d3.nest()
		.key(d => d[title0])
		.rollup(e => { 
			return {
				'length': e.length, 
				'totalLines': d3.sum(e, d => d.totalLines)
			}
		})
		.entries(metaLines)

	let nested1 = d3.nest()
		.key(d => d[title1])
		.rollup(e => { 
			return {
				'length': e.length, 
				'totalLines': d3.sum(e, d => d.totalLines)
			}
		})
		.entries(metaLines)

	let nested2 = d3.nest()
		.key(d => d[title2])
		.rollup(e => { 
			return {
				'length': e.length, 
				'totalLines': d3.sum(e, d => d.totalLines)
			}
		})
		.entries(metaLines)

	nestedLengths = {[title0]:nested0.length, [title1]:nested1.length, [title2]:nested2.length}

}


function groupBubbles(){
	const forceCollide = d3.forceCollide(d => scaleR(d.totalLines) + 2)
		.iterations(10)

	const simulation = d3.forceSimulation(metaLines)
		.force('x', d3.forceX(graphicW/2)
			.strength(0.2))
		.force('y', d3.forceY(graphicH/2)
			.strength(0.5))
		.force('collide', forceCollide)
		//.stop()
		.on('tick', ticked)

	d3.selectAll('.circle')
		.style('fill', '#000')
}

function splitBubbles(splitValue){
	d3.selectAll('.circleEncl').remove()

	splitNest = d3.nest()
		.key(d => d[splitValue])
		.entries(metaLines)

	let length = splitNest.length

	let boundingWidth = graphicW - (margin.left * 8)

	const splitMap = splitNest.map((d, i) => {
		return {key: d.key, index: i, width: boundingWidth * ((i + 1) / length)}
	})

	let widthMap = d3.map(splitMap, d => d.key)


	const forceCollide = d3.forceCollide(d => scaleR(d.totalLines) + 2)
		.iterations(10)

	const forceXSplit = d3.forceX((d, i) => widthMap.get(d[splitValue]).width)
        .strength(0.1);

    let rows = Math.ceil(splitMap.length / rowLength)

	const simulation = d3.forceSimulation(metaLines)
		.force('x', forceXSplit
			.strength(0.2))
		.force('y', d3.forceY(graphicH/2)
			.strength(0.5))
		.force('collide', forceCollide)
		//.stop()
		.on('tick', splitTicked)

	let mapValues = splitNest.map(d => {
		let values = d.values

		let mapped = values.map(e => {
			let radius = scaleR(e.totalLines)
			return {x: e.x, y: e.y, r: radius + 5}
		})
		return mapped
	})

	encCircle = mapValues.map(d => d3.packEnclose(d))

	boundingCircles = svg.selectAll(".circleEncl")
    		.data(encCircle)//, 260])
    	.enter()
    	.append("circle")
	    	.attr("cx", (d) => d.x)
	    	.attr("cy", (d) => d.y)
	    	.attr("r", (d) => d.r + 5)
	    	.attr('class', 'circleEncl')

}

function colorBubbles(colorValue){
	const colorNest = d3.nest()
		.key(d => d[colorValue])
		.entries(metaLines)

	const colorMap = colorNest.map((d, i) => {
		return d.key
	})

	colorScale.domain([0, colorMap.length])

	d3.selectAll('.circle')
		.style('fill', d => colorScale(d[colorValue]))

}

function splitTicked(){
	const forceCollide = d3.forceCollide(d => scaleR(d.totalLines) + 2)
		.iterations(10)

	d3.selectAll('.circle')
			.attr("cx", function(d) {
				return d.x
				/*let newX = Math.max(40, Math.min(graphicW - 40, d.x))
				return newX*/
			})
			.attr("cy", function(d) {
				return d.y
			})

	let mapValues = splitNest.map(d => {
		let values = d.values

		let mapped = values.map(e => {
			let radius = scaleR(e.totalLines)
			return {x: e.x, y: e.y, r: radius + 5}
		})
		return mapped
	})

	encCircle = mapValues.map(d => d3.packEnclose(d))

	boundingCircles
		.data(encCircle)
		.attr("cx", (d) => d.x + 5)
	    .attr("cy", (d) => d.y)
	    .attr("r", 0)
		.transition()
		.duration(20)
	    .attr("r", (d) => d.r + 10)

}

function ticked(){
	const forceCollide = d3.forceCollide(d => scaleR(d.totalLines) + 2)
		.iterations(10)

	d3.selectAll('.circle')
			.attr("cx", function(d) {
				return d.x
				/*let newX = Math.max(40, Math.min(graphicW - 40, d.x))
				return newX*/
			})
			.attr("cy", function(d) {
				return d.y
			})

}



/*function findSmallestCategory(){

	let selectedCat = d3.selectAll('.is-active')._groups[0]



	console.log({selectedCat})

		let selectedArray = []

		let selectedValues = Array.from(selectedCat).forEach(d => {
			let val = d.value

			selectedArray.push(val)
		})

	//nestedLengths.reduce((result, key) => ({ ...result, [key]: selectedCat[key] }), {});


	let smallestCat = Object.keys(nestedLengths).reduce((a, b) => nestedLengths[a] < nestedLengths[b] ? a : b);

	console.log({nestedLengths, smallestCat})
}*/

