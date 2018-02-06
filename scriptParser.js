let script = null
let scriptRegex = null
let inline = null
let parsedScript = null
let scriptOnly = null
let nestedChar = null
let characterLines = null


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

function setup(){
	setupScriptRegex()
	defineInline()
	parsedScript = parseToJson()
	cleanScript()
}

function cleanScript(){
	isolateScript()
	isolateCharacters()
	console.log(characterLines)

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