# frozen_string_literal: true

require 'spec_helper'

RSpec.describe 'books' do
  it 'bakes dummy' do
    expect('dummy').to bake_correctly
  end

  it 'bakes anthropology' do
    expect('anthropology').to bake_correctly
  end

  it 'bakes chemistry' do
    expect('chemistry').to bake_correctly
  end

  it 'bakes calculus' do
    expect('calculus').to bake_correctly
  end

  it 'bakes precalculus' do
    expect('precalculus').to bake_correctly
  end

  it 'bakes college algebra' do
    expect('college-algebra').to bake_correctly_with('precalculus')
  end

  it 'bakes trigonometry' do
    expect('trigonometry').to bake_correctly_with('precalculus')
  end

  it 'bakes college algebra coreq' do
    expect('college-algebra-coreq').to bake_correctly_with('precalculus-coreq')
  end

  it 'bakes u-physics' do
    expect('u-physics').to bake_correctly
  end

  it 'bakes sociology' do
    expect('sociology').to bake_correctly
  end

  it 'bakes statistics' do
    expect('statistics').to bake_correctly
  end

  it 'bakes american_government' do
    expect('american_government').to bake_correctly
  end

  it 'bakes microbio' do
    expect('microbiology').to bake_correctly
  end

  it 'bakes political science' do
    expect('political-science').to bake_correctly
  end

  it 'bakes philosophy' do
    expect('philosophy').to bake_correctly
  end

  it 'bakes biology' do
    expect('biology').to bake_correctly
  end

  it 'bakes english-composition' do
    expect('english-composition').to bake_correctly
  end

  it 'bakes contemporary-math' do
    expect('contemporary-math').to bake_correctly
  end

  it 'bakes pl-psychology' do
    expect('pl-psychology').to bake_correctly
  end

  it 'bakes finance' do
    expect('finance').to bake_correctly
  end
end
