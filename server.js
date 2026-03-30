async function handleSubmit() {
  if (!validateStep(3)) return;

  document.getElementById('thankyou').style.display = 'flex';

  let data = {};

  // Dados básicos
  data.first_name = document.querySelector('input[placeholder="José"]').value;
  data.last_name = document.querySelector('input[placeholder="Oliveira"]').value;
  data.email = document.querySelector('input[placeholder="jose@yourbrand.com"]').value;
  data.instagram = document.querySelector('input[placeholder="@yourbrand"]').value;
  data.website = document.querySelector('input[placeholder="www.yourbrand.com"]').value;

  const country = document.getElementById('phone-country');
  const phone = document.getElementById('phone');
  if (country && phone) data.phone = country.value + ' ' + phone.value;

  // Textareas
  const tas = document.querySelectorAll('textarea');
  data.ideal_client = tas[0]?.value || '';
  data.vision = tas[1]?.value || '';
  data.additional_context = tas[2]?.value || '';

  // Selects
  data.cinematic_direction = document.querySelector('#step2 select').value;
  data.primary_goal = document.querySelectorAll('#step2 select')[1].value;
  data.intended_investment = document.querySelector('#step3 select').value;
  data.marketing_investment = document.querySelectorAll('#step3 select')[1].value;
  data.how_found_us = document.querySelectorAll('select')[document.querySelectorAll('select').length - 1].value;

  // Checkboxes
  data.results_matter = Array.from(document.querySelectorAll('#results-select input:checked'))
    .map(i => i.parentElement.innerText).join(', ');

  data.usage_platforms = Array.from(document.querySelectorAll('#usage-select input:checked'))
    .map(i => i.parentElement.innerText).join(', ');

  data.decision_makers = Array.from(document.querySelectorAll('#decision-select input:checked'))
    .map(i => i.parentElement.innerText).join(', ');

  // Timeline
  data.timeline = document.getElementById('timeline-input').value;

  console.log('Enviando dados:', data);

  try {
    const response = await fetch('https://apply.joseoliveirafilms.com/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Erro no envio');

    console.log('✅ Lead enviado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao enviar:', err);
  }
}
