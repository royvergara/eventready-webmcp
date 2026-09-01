import test from 'node:test';
import assert from 'node:assert/strict';
import { addBasketItem, basketMetrics, basketSubtotal, recommendedBasket, setBasketQuantity, swapBasketItem } from '../shared/basket.js';

const chicken={id:'chicken',catalogKey:'caterer:chicken',vendor:'caterer',category:'main',claimed_serves:20,price:100,dietary:['gluten_free']};
const vegetables={id:'veg',catalogKey:'caterer:veg',vendor:'caterer',category:'main',claimed_serves:10,price:70,dietary:['vegetarian','vegan','gluten_free']};

test('a recommendation becomes editable line-level basket state',()=>{
  const seeded=recommendedBasket([chicken,chicken,vegetables],1);
  assert.deepEqual(seeded.map(row=>[row.id,row.quantity]),[['chicken',2],['veg',1]]);
  const changed=setBasketQuantity(seeded,'caterer:chicken',1);
  assert.equal(basketSubtotal(changed),170);
});

test('adding and swapping preserve explicit quantities',()=>{
  const added=addBasketItem([],chicken,2);
  const swapped=swapBasketItem(added,'caterer:chicken',vegetables);
  assert.equal(swapped[0].id,'veg');
  assert.equal(swapped[0].quantity,2);
});

test('coverage gaps are recalculated from the customized basket',()=>{
  const metrics=basketMetrics([{...vegetables,quantity:1}],{vegan:14,gluten_free:8},20);
  assert.equal(metrics.servingShort,10);
  assert.equal(metrics.dietary.vegan.short,4);
  assert.equal(metrics.dietary.gluten_free.short,0);
});
