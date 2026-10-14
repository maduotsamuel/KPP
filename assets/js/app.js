import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
const ready = SUPABASE_URL.startsWith('https://') && !SUPABASE_PUBLISHABLE_KEY.startsWith('PASTE');
export const sb = ready ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
export const configured = ready;
export const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fallbackPortfolio = [
 {title:'Stories in Motion',category:'Portraits',image:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=80',description:'Authentic portraits and creative direction.'},
 {title:'A Night to Remember',category:'Events',image:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80',description:'Every moment deserves to be remembered.'},
 {title:'The Sound of the City',category:'Music',image:'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&q=80',description:'Putting new talent in the spotlight.'},
 {title:'Love, Beautifully Told',category:'Weddings',image:'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80',description:'Wedding photography that tells your story.'}
];
const fallbackArtists=[{name:'Emerging voices',genre:'Music and artist promotion',image:'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=900&q=80',description:'Fresh releases and emerging talent.'}];
export async function getRecords(table,limit=100){
 if(!sb) return table==='portfolio'?fallbackPortfolio:table==='artists'?fallbackArtists:[];
 const {data,error}=await sb.from(table).select('*').order('created_at',{ascending:false}).limit(limit);
 if(error) throw error;
 return data||[];
}
function card(item,artist=false){
 const name=artist?item.name:item.title;const meta=artist?item.genre:item.category;
 return `<article class="gallery-item"><img loading="lazy" src="${esc(item.image)}" alt="${esc(name)}"><div class="gallery-content"><small>${esc(meta)}</small><h3>${esc(name)}</h3><p>${esc(item.description)}</p></div></article>`;
}
export async function gallery(table,id,limit){
 const el=document.getElementById(id);if(!el)return;
 try{const entries=await getRecords(table,limit);el.innerHTML=entries.length?entries.map(x=>card(x,table==='artists')).join(''):'<p>No items published yet. Check back soon.</p>';}
 catch(e){el.textContent='Unable to load content right now. Please try again later.';console.error(e);}
}
export function message(id,text,success=false){const e=document.getElementById(id);if(!e)return;e.className=`alert ${success?'alert-success':'alert-danger'}`;e.textContent=text;e.hidden=false;}
export async function submitEnquiry(form){
 if(!sb){message('form-status','Supabase is not configured yet. You can contact us by phone or email.');return;}
 const fd=new FormData(form),fields=Object.fromEntries(fd.entries());
 if(fields.website) return; // honeypot
 const {name,email,phone,service,event_date,message:msg}=fields;
 if(!name?.trim()||!email?.trim()||!msg?.trim()){message('form-status','Please complete the required fields.');return;}
 if(msg.length>3000){message('form-status','Please shorten your message.');return;}
 const button=form.querySelector('[type=submit]');button.disabled=true;
 try{
  const {error}=await sb.from('enquiries').insert({name:name.trim(),email:email.trim(),phone:phone?.trim()||null,service:service||null,event_date:event_date||null,message:msg.trim()});
  if(error)throw error;form.reset();message('form-status','Thanks. Your enquiry has been sent.',true);
 }catch(e){console.error(e);message('form-status','Sorry, your enquiry could not be sent. Please email or WhatsApp us.');}finally{button.disabled=false;}
}
window.addEventListener('DOMContentLoaded',()=>{
 if(document.getElementById('home-work'))gallery('portfolio','home-work',3);
 if(document.getElementById('portfolio-grid'))gallery('portfolio','portfolio-grid',100);
 if(document.getElementById('artist-grid'))gallery('artists','artist-grid',100);
 const form=document.getElementById('enquiry-form');if(form)form.addEventListener('submit',e=>{e.preventDefault();submitEnquiry(form)});
});
