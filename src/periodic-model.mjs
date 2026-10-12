// Conventional La/Ac group-3 layout, consistent with the RSC block labels.
// Block is a periodic-table classification, not an exact configuration rule.
const names=`H Hydrogen|He Helium|Li Lithium|Be Beryllium|B Boron|C Carbon|N Nitrogen|O Oxygen|F Fluorine|Ne Neon|Na Sodium|Mg Magnesium|Al Aluminium|Si Silicon|P Phosphorus|S Sulfur|Cl Chlorine|Ar Argon|K Potassium|Ca Calcium|Sc Scandium|Ti Titanium|V Vanadium|Cr Chromium|Mn Manganese|Fe Iron|Co Cobalt|Ni Nickel|Cu Copper|Zn Zinc|Ga Gallium|Ge Germanium|As Arsenic|Se Selenium|Br Bromine|Kr Krypton|Rb Rubidium|Sr Strontium|Y Yttrium|Zr Zirconium|Nb Niobium|Mo Molybdenum|Tc Technetium|Ru Ruthenium|Rh Rhodium|Pd Palladium|Ag Silver|Cd Cadmium|In Indium|Sn Tin|Sb Antimony|Te Tellurium|I Iodine|Xe Xenon|Cs Caesium|Ba Barium|La Lanthanum|Ce Cerium|Pr Praseodymium|Nd Neodymium|Pm Promethium|Sm Samarium|Eu Europium|Gd Gadolinium|Tb Terbium|Dy Dysprosium|Ho Holmium|Er Erbium|Tm Thulium|Yb Ytterbium|Lu Lutetium|Hf Hafnium|Ta Tantalum|W Tungsten|Re Rhenium|Os Osmium|Ir Iridium|Pt Platinum|Au Gold|Hg Mercury|Tl Thallium|Pb Lead|Bi Bismuth|Po Polonium|At Astatine|Rn Radon|Fr Francium|Ra Radium|Ac Actinium|Th Thorium|Pa Protactinium|U Uranium|Np Neptunium|Pu Plutonium|Am Americium|Cm Curium|Bk Berkelium|Cf Californium|Es Einsteinium|Fm Fermium|Md Mendelevium|No Nobelium|Lr Lawrencium|Rf Rutherfordium|Db Dubnium|Sg Seaborgium|Bh Bohrium|Hs Hassium|Mt Meitnerium|Ds Darmstadtium|Rg Roentgenium|Cn Copernicium|Nh Nihonium|Fl Flerovium|Mc Moscovium|Lv Livermorium|Ts Tennessine|Og Oganesson`.split('|');
const rows=[
 [1,2], [3,4,5,6,7,8,9,10], [11,12,13,14,15,16,17,18],
 Array.from({length:18},(_,i)=>19+i),Array.from({length:18},(_,i)=>37+i),
 [55,56,57,...Array.from({length:15},(_,i)=>72+i)],
 [87,88,89,...Array.from({length:15},(_,i)=>104+i)]
];
const placement=new Map();
rows.forEach((row,i)=>row.forEach((z,j)=>{
 const group=i===0?(j===0?1:18):i<3?(j<2?j+1:j+11):j+1;
 placement.set(z,{period:i+1,group,row:i+2,column:group+1,block:z===2||group<=2?'s':group>=13?'p':'d'});
}));
for(const [start,period,row] of [[58,6,10],[90,7,11]])for(let i=0;i<14;i++)placement.set(start+i,{period,group:null,row,column:i+4,block:'f'});
export const ELEMENTS=names.map((entry,i)=>{const [symbol,...name]=entry.split(' ');return {number:i+1,symbol,name:name.join(' '),...placement.get(i+1)};});
export const BLOCKS={
 s:{color:'#9c5e16',tint:'#f8e7c9',orbitals:1,capacity:2,shape:'Spherical',description:'The s region includes groups 1 and 2, plus helium.',orbital:'1s'},
 p:{color:'#146f66',tint:'#d8eee6',orbitals:3,capacity:6,shape:'Two lobes',description:'The p region spans groups 13–18, excluding helium.',orbital:'px'},
 d:{color:'#3659a1',tint:'#e0e8fa',orbitals:5,capacity:10,shape:'Five orientations',description:'The d region lies across the centre of the table, in groups 3–12.',orbital:'dxy'},
 f:{color:'#795195',tint:'#eee2f4',orbitals:7,capacity:14,shape:'Seven orientations',description:'The f region is displayed in two detached rows, within periods 6 and 7.',orbital:null}
};
export function matchesElement(element,query='',block='all'){
 const q=query.trim().toLowerCase();
 return (block==='all'||element.block===block)&&(!q||element.name.toLowerCase().includes(q)||element.symbol.toLowerCase()===q||String(element.number)===q);
}
