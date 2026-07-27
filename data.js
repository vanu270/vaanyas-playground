/* =============================================================
   data.js — all content lives here, no logic.
   Adding a lesson = adding an object. No new code required.
   ============================================================= */
window.VPContent = (function(){

/* ---------- Worlds (Adventure Mode) ---------- */
const WORLDS = [
  {id:'home',    name:'Home Village',    emoji:'🏡', stars:0,   color:'#fbbf24', blurb:'Where every adventure begins!'},
  {id:'forest',  name:'Number Forest',   emoji:'🌳', stars:0,   color:'#22c55e', blurb:'Counting, numbers and maths magic'},
  {id:'castle',  name:'Alphabet Castle', emoji:'🏰', stars:120, color:'#a855f7', blurb:'Letters, sounds and words'},
  {id:'puzzle',  name:'Puzzle Mountain', emoji:'🧩', stars:280, color:'#f97316', blurb:'Memory, logic and brain teasers'},
  {id:'space',   name:'Space Academy',   emoji:'🚀', stars:480, color:'#3b82f6', blurb:'Planets, science and big ideas'},
  {id:'dino',    name:'Dinosaur Island', emoji:'🦖', stars:700, color:'#14b8a6', blurb:'Animals, nature and giant lizards'},
  {id:'treasure',name:'Treasure Kingdom',emoji:'🏆', stars:1000,color:'#ec4899', blurb:'Master everything you have learned'}
];

/* ---------- Lessons: which activity each world contains ----------
   href      page that runs it
   mode      the generator id inside that page
   min       minimum player level to try it                        */
const LESSONS = {
  home: [
    {mode:'count',    href:'math.html',     icon:'🍎', name:'Count Objects',    min:1},
    {mode:'colors',   href:'science.html',  icon:'🎨', name:'Match Colors',     min:1},
    {mode:'shapes',   href:'logic.html',    icon:'🔺', name:'Shape Match',      min:1},
    {mode:'animals',  href:'science.html',  icon:'🦁', name:'Animal Friends',   min:1},
    {mode:'free',     href:'paint.html',    icon:'🖌️', name:'Finger Paint',     min:1}
  ],
  forest: [
    {mode:'recognise',href:'math.html',     icon:'🔢', name:'Number Names',     min:1},
    {mode:'order',    href:'math.html',     icon:'🔀', name:'Number Ordering',  min:1},
    {mode:'beforeAfter',href:'math.html',   icon:'↔️', name:'Before & After',   min:2},
    {mode:'padd',     href:'math.html',     icon:'🍎', name:'Picture Adding',   min:2},
    {mode:'add',      href:'math.html',     icon:'➕', name:'Addition',         min:2},
    {mode:'nline',    href:'math.html',     icon:'📏', name:'Number Line',      min:3},
    {mode:'psub',     href:'math.html',     icon:'🍪', name:'Picture Taking Away', min:3},
    {mode:'sub',      href:'math.html',     icon:'➖', name:'Subtraction',      min:3},
    {mode:'miss',     href:'math.html',     icon:'❓', name:'Missing Number',   min:3},
    {mode:'cmp',      href:'math.html',     icon:'⚖️', name:'Bigger or Smaller',min:2},
    {mode:'equal',    href:'math.html',     icon:'🟰', name:'Equal To',         min:3},
    {mode:'evenodd',  href:'math.html',     icon:'🎲', name:'Even & Odd',       min:4},
    {mode:'skip',     href:'math.html',     icon:'🦘', name:'Skip Counting',    min:4},
    {mode:'mul',      href:'math.html',     icon:'✖️', name:'Times Tables',     min:5},
    {mode:'div',      href:'math.html',     icon:'➗', name:'Sharing (Divide)', min:5}
  ],
  castle: [
    {mode:'letter',   href:'english.html',  icon:'🔤', name:'Find the Letter',  min:1},
    {mode:'case',     href:'english.html',  icon:'Aa', name:'Big & Small Letters', min:2},
    {mode:'picture',  href:'english.html',  icon:'🍎', name:'Letter & Picture', min:2},
    {mode:'begin',    href:'english.html',  icon:'🅰️', name:'Beginning Sounds', min:3},
    {mode:'end',      href:'english.html',  icon:'🔚', name:'Ending Sounds',    min:4},
    {mode:'missing',  href:'english.html',  icon:'␣',  name:'Missing Letter',   min:3},
    {mode:'spell',    href:'english.html',  icon:'✏️', name:'Spelling Game',    min:4},
    {mode:'sight',    href:'english.html',  icon:'👁️', name:'Sight Words',      min:4},
    {mode:'rhyme',    href:'english.html',  icon:'🎵', name:'Rhyming Words',    min:5},
    {mode:'sentence', href:'english.html',  icon:'📝', name:'Simple Sentences', min:5},
    {mode:'free',     href:'letters.html',  icon:'🎪', name:'Letter Pops',      min:1}
  ],
  puzzle: [
    {mode:'shapes',   href:'logic.html',    icon:'🔷', name:'Shape Match',      min:1},
    {mode:'shadow',   href:'logic.html',    icon:'👤', name:'Shadow Match',     min:2},
    {mode:'odd',      href:'logic.html',    icon:'🔍', name:'Spot the Odd One', min:2},
    {mode:'sequence', href:'logic.html',    icon:'🔢', name:'Sequence Game',    min:3},
    {mode:'simon',    href:'logic.html',    icon:'🎼', name:'Simon Says',       min:3},
    {mode:'size',     href:'logic.html',    icon:'📐', name:'Big, Small, Middle',min:2},
    {mode:'free',     href:'memory.html',   icon:'🧠', name:'Memory Cards',     min:1},
    {mode:'free',     href:'patterns.html', icon:'🔁', name:'Pattern Match',    min:1}
  ],
  space: [
    {mode:'space',    href:'science.html',  icon:'🪐', name:'Solar System',     min:1},
    {mode:'weather',  href:'science.html',  icon:'🌦️', name:'Weather',          min:1},
    {mode:'seasons',  href:'science.html',  icon:'🍂', name:'Seasons',          min:2},
    {mode:'body',     href:'science.html',  icon:'👋', name:'Body Parts',       min:2},
    {mode:'helpers',  href:'science.html',  icon:'👩‍🚒', name:'Community Helpers',min:3},
    {mode:'vehicles', href:'science.html',  icon:'🚗', name:'Vehicles',         min:1}
  ],
  dino: [
    {mode:'dinos',    href:'science.html',  icon:'🦕', name:'Dinosaurs',        min:1},
    {mode:'ocean',    href:'science.html',  icon:'🐠', name:'Ocean Animals',    min:1},
    {mode:'birds',    href:'science.html',  icon:'🦜', name:'Birds',            min:1},
    {mode:'fruits',   href:'science.html',  icon:'🍓', name:'Fruits',           min:1},
    {mode:'veg',      href:'science.html',  icon:'🥕', name:'Vegetables',       min:2},
    {mode:'animals',  href:'science.html',  icon:'🦁', name:'Animal Sounds',    min:1}
  ],
  treasure: [
    {mode:'mixed',    href:'math.html',     icon:'🧮', name:'Maths Challenge',  min:4},
    {mode:'mixed',    href:'english.html',  icon:'📚', name:'Word Challenge',   min:4},
    {mode:'mixed',    href:'logic.html',    icon:'🧠', name:'Brain Challenge',  min:4},
    {mode:'mixed',    href:'science.html',  icon:'🌍', name:'World Challenge',  min:4},
    {mode:'free',     href:'balloons.html', icon:'🎈', name:'Balloon Party',    min:1}
  ]
};

/* ---------- Science / general-knowledge sets: [emoji, name, fun fact] ---------- */
const TOPICS = {
  animals:  {title:'Animals',    items:[['🐶','Dog','says woof woof'],['🐱','Cat','says meow'],['🐮','Cow','gives us milk'],['🦁','Lion','is king of the jungle'],['🐘','Elephant','has a long trunk'],['🐵','Monkey','loves bananas'],['🐷','Pig','says oink'],['🐑','Sheep','gives us wool'],['🐰','Rabbit','hops very fast'],['🐻','Bear','sleeps all winter']]},
  birds:    {title:'Birds',      items:[['🦜','Parrot','can copy your voice'],['🦉','Owl','stays awake at night'],['🦚','Peacock','has beautiful feathers'],['🐦','Sparrow','is a tiny bird'],['🦢','Swan','swims on the lake'],['🐧','Penguin','cannot fly but swims'],['🦅','Eagle','flies very high'],['🐓','Rooster','wakes us in the morning']]},
  fruits:   {title:'Fruits',     items:[['🍎','Apple','is crunchy and sweet'],['🍌','Banana','is soft and yellow'],['🍇','Grapes','grow in bunches'],['🍓','Strawberry','is red with tiny seeds'],['🍊','Orange','is full of juice'],['🍉','Watermelon','is big and juicy'],['🥭','Mango','is the king of fruits'],['🍍','Pineapple','is spiky outside']]},
  veg:      {title:'Vegetables', items:[['🥕','Carrot','helps you see well'],['🥦','Broccoli','looks like a little tree'],['🌽','Corn','has golden kernels'],['🍅','Tomato','is round and red'],['🥔','Potato','grows under the ground'],['🧅','Onion','can make you cry'],['🥒','Cucumber','is cool and crunchy'],['🫑','Pepper','comes in many colours']]},
  vehicles: {title:'Vehicles',   items:[['🚗','Car','drives on the road'],['🚌','Bus','carries many people'],['🚂','Train','runs on tracks'],['✈️','Aeroplane','flies in the sky'],['🚁','Helicopter','has spinning blades'],['🚢','Ship','sails on the sea'],['🚲','Bicycle','has two wheels'],['🚒','Fire Engine','rushes to help']]},
  ocean:    {title:'Ocean Animals', items:[['🐠','Fish','swims in schools'],['🐳','Whale','is the biggest animal'],['🐙','Octopus','has eight arms'],['🦀','Crab','walks sideways'],['🐢','Turtle','carries its home'],['🦈','Shark','has sharp teeth'],['🐬','Dolphin','is very clever'],['🦭','Seal','claps its flippers']]},
  dinos:    {title:'Dinosaurs',  items:[['🦕','Brontosaurus','had a very long neck'],['🦖','T-Rex','had tiny arms'],['🥚','Dino Egg','is where babies hatch'],['🦴','Fossil','is a very old bone'],['🌋','Volcano','erupted long ago'],['🐊','Crocodile','is a dinosaur cousin']]},
  space:    {title:'Solar System', items:[['☀️','Sun','gives us light and heat'],['🌙','Moon','glows at night'],['🌍','Earth','is our home planet'],['🪐','Saturn','has beautiful rings'],['⭐','Star','twinkles far away'],['🚀','Rocket','flies to space'],['👨‍🚀','Astronaut','floats in space'],['☄️','Comet','has a bright tail']]},
  weather:  {title:'Weather',    items:[['☀️','Sunny','is warm and bright'],['🌧️','Rainy','makes puddles'],['⛈️','Stormy','has thunder'],['❄️','Snowy','is cold and white'],['🌈','Rainbow','has seven colours'],['💨','Windy','blows the leaves'],['☁️','Cloudy','hides the sun'],['🌫️','Foggy','makes it hard to see']]},
  body:     {title:'Body Parts', items:[['👁️','Eye','helps you see'],['👂','Ear','helps you hear'],['👃','Nose','helps you smell'],['👄','Mouth','helps you taste'],['👋','Hand','helps you hold'],['🦶','Foot','helps you walk'],['🦷','Tooth','helps you chew'],['🧠','Brain','helps you think']]},
  helpers:  {title:'Community Helpers', items:[['👩‍⚕️','Doctor','keeps us healthy'],['👩‍🚒','Firefighter','puts out fires'],['👮','Police Officer','keeps us safe'],['👩‍🏫','Teacher','helps us learn'],['👨‍🌾','Farmer','grows our food'],['👨‍🍳','Chef','cooks tasty food'],['📮','Postman','brings the letters'],['👷','Builder','builds our houses']]},
  seasons:  {title:'Seasons',    items:[['🌸','Spring','is when flowers bloom'],['☀️','Summer','is hot and sunny'],['🍂','Autumn','is when leaves fall'],['❄️','Winter','is cold and snowy']]},
  colors:   {title:'Colors',     items:[['🔴','Red','like an apple'],['🔵','Blue','like the sky'],['🟢','Green','like the grass'],['🟡','Yellow','like the sun'],['🟠','Orange','like a carrot'],['🟣','Purple','like a grape'],['🟤','Brown','like a bear'],['⚫','Black','like the night']]}
};

/* ---------- English content ---------- */
const WORDS = {
  A:['Apple','🍎'],B:['Ball','⚽'],C:['Cat','🐱'],D:['Dog','🐶'],E:['Elephant','🐘'],F:['Fish','🐟'],
  G:['Grapes','🍇'],H:['Hat','🎩'],I:['Ice cream','🍦'],J:['Juice','🧃'],K:['Kite','🪁'],L:['Lion','🦁'],
  M:['Moon','🌙'],N:['Nest','🪺'],O:['Orange','🍊'],P:['Penguin','🐧'],Q:['Queen','👑'],R:['Rainbow','🌈'],
  S:['Sun','☀️'],T:['Train','🚂'],U:['Umbrella','☂️'],V:['Violin','🎻'],W:['Whale','🐳'],X:['Xylophone','🎼'],
  Y:['Yo-yo','🪀'],Z:['Zebra','🦓']
};
const SPELL = [['CAT','🐱'],['DOG','🐶'],['SUN','☀️'],['HAT','🎩'],['PIG','🐷'],['COW','🐮'],['BEE','🐝'],
  ['FOX','🦊'],['BUS','🚌'],['STAR','⭐'],['BALL','⚽'],['FISH','🐟'],['MOON','🌙'],['CAKE','🍰'],['TREE','🌳']];
const SIGHT_WORDS = ['the','and','is','you','we','see','go','my','it','to','can','like','a','me','he','she','in','up'];
const RHYMES = [['cat',['hat','bat','mat'],['dog','sun','cup']],['dog',['log','frog','hog'],['cat','pen','bus']],
  ['sun',['fun','run','bun'],['cat','top','leg']],['star',['car','jar','far'],['sun','pen','box']],
  ['tree',['bee','sea','key'],['cat','dog','sun']],['cake',['lake','snake','rake'],['dog','pen','cup']]];
const SENTENCES = [['I see the','🐱','cat'],['The','☀️','sun','is hot'],['I like my','🐶','dog'],
  ['We can','🏃','run'],['The','🚗','car','is red'],['My','🎈','balloon','can fly']];

/* ---------- Sticker packs ---------- */
const STICKER_PACKS = {
  Animals:   ['🐶','🐱','🦁','🐘','🐵','🐧','🦊','🐼'],
  Dinosaurs: ['🦕','🦖','🥚','🌋','🦴','🐊'],
  Space:     ['🚀','🌙','⭐','🪐','👨‍🚀','🛸','☄️','🌌'],
  Vehicles:  ['🚗','🚌','🚂','✈️','🚁','🚜','🚑','🚲'],
  Ocean:     ['🐠','🐳','🐙','🦀','🐡','🦈','🐚','🌊'],
  Farm:      ['🐮','🐷','🐔','🐑','🌾','🚜','🥕','🌻'],
  Nature:    ['🌳','🌸','🍄','🌈','🦋','🐝','🍁','🌻'],
  Fantasy:   ['🦄','🧚','🐉','🧙','👑','🪄','🏰','💎']
};

return {WORLDS, LESSONS, TOPICS, WORDS, SPELL, SIGHT_WORDS, RHYMES, SENTENCES, STICKER_PACKS};
})();
